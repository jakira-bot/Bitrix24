import { ManualDeal, EnrichmentProviderResponse, UnifiedEnrichmentResponse, UnifiedKeyInfo } from "../../app/types";
import { generateObject } from "ai";
import { z } from "zod";
import { google } from "../ai/available-models";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Mock Exa enrichment provider
 */
export async function mockExaEnricher(): Promise<EnrichmentProviderResponse> {
  await sleep(120 + Math.floor(Math.random() * 200));
  return {
    provider: "ExaMock",
    resultTitle: "Exa Analysis — Mock Data",
    rawText: "Revenue: $1,200,000. EBITDA: $300,000. Margin: 25%. Industry: Technology. Location: San Francisco, CA.",
    summary: "Exa identifies this as a Technology deal with a 25% EBITDA margin. Recommended next step: validate financials.",
    url: "https://exa.mock/results/12345",
    author: "Exa Research Bot",
    publishedDate: new Date().toISOString(),
    context: "Mock context for Exa enrichment provider.",
  };
}

/**
 * Mock Perplexity enrichment provider
 */
export async function mockPerplexityEnricher(): Promise<EnrichmentProviderResponse> {
  await sleep(80 + Math.floor(Math.random() * 220));
  return {
    provider: "PerplexityMock",
    resultTitle: "Perplexity Summary — Mock Data",
    rawText: "Estimated revenue: $1,250,000. EBITDA: $310,000. Industry: Technology. Contact: John Doe. Location: San Francisco.",
    summary: "Perplexity suggests this is a Technology deal with $1.25M revenue and $310K EBITDA. Follow-up: confirm contact details.",
    url: "https://perplexity.mock/search?q=mock-data",
    author: "Perplexity Mock Agent",
    publishedDate: new Date().toISOString(),
    context: "Mock context for Perplexity enrichment provider.",
  };
}

/**
 * Mock Crunchbase enrichment provider
 */
export async function mockCrunchbaseEnricher(): Promise<EnrichmentProviderResponse> {
  await sleep(140 + Math.floor(Math.random() * 260));
  return {
    provider: "CrunchbaseMock",
    resultTitle: "Crunchbase Profile — Mock Data",
    rawText: "Company: MockTech. Revenue: $1,300,000. EBITDA: $320,000. Industry: Technology. Location: San Francisco, CA.",
    summary: "Crunchbase mock profile for MockTech, a Technology company with $1.3M revenue and $320K EBITDA.",
    url: "https://www.crunchbase.com/organization/mocktech",
    author: "Crunchbase Mock Scraper",
    publishedDate: new Date().toISOString(),
    context: "Mock context for Crunchbase enrichment provider.",
  };
}

/**
 * Attempt to extract structured key/value pairs from a provider response using the AI SDK.
 * Returns an object mapping keys to (string | number).
 */
async function extractKeyValuesFromResponse(
  resp: EnrichmentProviderResponse,
): Promise<Record<string, string | number>> {
  // schema: a record of string -> string|number
  const schema = z.record(z.string(), z.union([z.number(), z.string()]));

  try {
    const prompt = `Extract short key-value pairs from the following provider output. Return only a flat JSON object where keys are short identifiers (e.g., ebitda, revenue, askingPrice, industry, location, contact_email) and values are numbers when possible or strings otherwise.

Provider title: ${resp.resultTitle}
Provider summary: ${resp.summary}
Provider rawText: ${resp.rawText}

If a numeric value is present (currency, percent, plain number) return it as a number. If ambiguous, return as string.`;

    const { object } = await generateObject({
      model: google("gemini-pro"),
      prompt,
      schema,
    });

    return (object ?? {}) as Record<string, string | number>;
  } catch (e) {
    // fallback: very small heuristic parser for common finance keys
    const text = `${resp.summary}\n${resp.rawText}`.toLowerCase();
    const out: Record<string, string | number> = {};

    const findNumberAfter = (keyword: string) => {
      const re = new RegExp(`${keyword}[:\\s]*\\$?([0-9,]+(?:\\.\\d+)?)`);
      const m = text.match(re);
      if (m && m[1]) return Number(m[1].replace(/,/g, ""));
      return undefined;
    };

    const revenue = findNumberAfter("revenue");
    if (revenue !== undefined) out.revenue = revenue;

    const ebitda = findNumberAfter("ebitda");
    if (ebitda !== undefined) out.ebitda = ebitda;

    const asking = findNumberAfter("asking") || findNumberAfter("asking price");
    if (asking !== undefined) out.askingPrice = asking;

    // strings
    const industryMatch = text.match(/industry[:\s]*([a-zA-Z0-9 &\-]+)/);
    if (industryMatch && industryMatch[1]) out.industry = industryMatch[1].trim();

    return out;
  }
}

/**
 * Merge multiple EnrichmentProviderResponse objects into a unified response with consensus values.
 */
export async function unifyEnrichmentResponses(
  responses: EnrichmentProviderResponse[],
): Promise<UnifiedEnrichmentResponse> {
  // extract per-provider key/value maps (use AI SDK where possible)
  const extractedList: Array<Record<string, string | number>> = [];
  for (const resp of responses) {
    try {
      const kv = await extractKeyValuesFromResponse(resp);
      extractedList.push(kv);
    } catch (e) {
      extractedList.push({});
    }
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

  return {
    unifiedKeys,
    summary,
    sources: responses,
    generatedAt: new Date().toISOString(),
  };
}
