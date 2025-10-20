import { IndividualEnrichmentResponse, UnifiedEnrichmentResponse, UnifiedKeyInfo, IndividualEnrichmentResponseSchema } from "../../app/types";
import { generateObject } from "ai";
import { z } from "zod";
import { google, openai, perplexity } from "../ai/available-models";

/**
 * Selects the appropriate model for the enrichment provider.
 */
function getModel(provider: "google" | "openai" | "perplexity") {
  switch (provider) {
    case "google":
      return google("gemini-pro");
    case "openai":
      return openai("gpt-4o");
    case "perplexity":
      return perplexity("sonar-pro");
    default:
      throw new Error("Unknown provider");
  }
}

/**
 * Main enrichment function for any provider.
 * Accepts provider name and raw text, returns structured enrichment response.
 */
export async function enrichDealWithProvider(
  provider: "google" | "openai" | "perplexity",
  rawText: string,
): Promise<IndividualEnrichmentResponse> {
  const prompt = `Extract private equity deal information from the following text. 
Return a JSON object matching this schema:
- provider: string
- resultTitle: string or null
- summary: string or null
- url: string or null
- author: string or null
- publishedDate: string or null
- context: string or null
- employees: array or null
- owner: object or null
- news: array of strings or null
- desc: string or null
- yearFounded: string or null
- structure: object or null
- segment: string or null
- extra: object mapping string keys to any additional info

If a field is missing, set it to null or omit.`;

  const { object } = await generateObject({
    model: getModel(provider),
    prompt: `${prompt}\n\nRaw provider output:\n${rawText}`,
    schema: IndividualEnrichmentResponseSchema,
  });

  return object as IndividualEnrichmentResponse;
}

/**
 * Merge multiple IndividualEnrichmentResponse objects into a unified response with consensus values.
 */
export async function unifyEnrichmentResponses(
  responses: IndividualEnrichmentResponse[],
): Promise<UnifiedEnrichmentResponse> {
  // Collect all keys from 'extra' and expected fields
  const extractedList: Array<Record<string, string | number>> = [];
  for (const resp of responses) {
    const kv: Record<string, string | number> = {};
    // Add expected fields if present
    if (resp.segment) kv.segment = resp.segment;
    if (resp.yearFounded) kv.yearFounded = resp.yearFounded;
    if (resp.desc) kv.desc = resp.desc;
    // Add arbitrary extra fields
    if (resp.extra) {
      Object.entries(resp.extra).forEach(([k, v]) => {
        kv[k] = v;
      });
    }
    extractedList.push(kv);
  }

  // collect all keys (normalize to lowercase keys for matching)
  const keySet = new Set<string>();
  extractedList.forEach((kv) =>
    Object.keys(kv).forEach((k) => keySet.add(k.toLowerCase())),
  );

  const unifiedKeys: Record<string, UnifiedKeyInfo> = {};

  for (const rawKey of keySet) {
    const values: Array<string | number> = [];
    const providers: string[] = [];

    // gather values reported for this canonical key
    extractedList.forEach((kv, idx) => {
      // try exact key first, then case-insensitive match
      const foundKey =
        Object.keys(kv).find((k) => k.toLowerCase() === rawKey) ?? undefined;
      if (foundKey) {
        const val = kv[foundKey];
        if (val !== undefined && val !== null && val !== "") {
          values.push(val);
          providers.push(responses[idx].provider ?? `provider-${idx}`);
        }
      }
    });

    if (values.length === 0) continue;

    // Decide consensus
    const numericVals: number[] = values
      .map((v) => {
        if (typeof v === "number") return v;
        // try parse numeric-looking strings
        if (typeof v === "string") {
          const cleaned = v.replace(/[^0-9.\-]/g, "");
          const n = Number(cleaned);
          return Number.isFinite(n) ? n : NaN;
        }
        return NaN;
      })
      .filter((n) => !Number.isNaN(n));

    let consensusMethod: UnifiedKeyInfo["consensusMethod"] = "single";
    let finalValue: string | number = values[0];

    if (numericVals.length > 0) {
      // compute average (rounded to nearest integer)
      const sum = numericVals.reduce((a, b) => a + b, 0);
      const avg = Math.round(sum / numericVals.length);
      finalValue = avg;
      consensusMethod = numericVals.length > 1 ? "average" : "single";
    } else {
      // non-numeric: pick the most frequent string (majority) or first
      const freq = new Map<string, number>();
      values.forEach((v) => {
        const s = String(v).trim();
        freq.set(s, (freq.get(s) || 0) + 1);
      });
      const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
      finalValue = sorted[0][0];
      consensusMethod = values.length > 1 ? "majority" : "single";
    }

    unifiedKeys[rawKey] = {
      value: finalValue,
      values,
      providers,
      consensusMethod,
    };
  }

  // Short summary generation (ask AI SDK to synthesize if available)
  let summary: string | undefined;
  try {
    // Compose a small prompt from unified keys and providers
    const keyPreview = Object.entries(unifiedKeys)
      .map(([k, info]) => `${k}: ${info.value} (${info.consensusMethod})`)
      .join("\n");

    const prompt = `You are an assistant that synthesizes multiple data enrichment providers into a single short summary. Given the extracted keys below, produce a 1-2 sentence summary capturing the combined view and any obvious discrepancies.

${keyPreview}

Also include which keys had disagreements (if any).`;

    const { object } = await generateObject({
      model: google("gemini-pro"),
      prompt,
      schema: z.object({
        summary: z.string(),
      }),
    });

    summary = (object as any)?.summary;
  } catch {
    summary = undefined;
  }

  // Helper to get first non-null value for a field
  function firstNonNull<T>(getter: (resp: IndividualEnrichmentResponse) => T | undefined): T | undefined {
    for (const resp of responses) {
      const val = getter(resp);
      if (val !== undefined && val !== null) return val;
    }
    return undefined;
  }

  return {
    employees: firstNonNull(r => r.employees),
    owner: firstNonNull(r => r.owner),
    news: firstNonNull(r => r.news),
    desc: firstNonNull(r => r.desc),
    yearFounded: firstNonNull(r => r.yearFounded),
    structure: firstNonNull(r => r.structure),
    segment: firstNonNull(r => r.segment),
    unifiedKeys,
    summary,
    sources: responses,
    generatedAt: new Date().toISOString(),
  };
}