import { ManualDeal, EnrichmentProviderResponse, UnifiedEnrichmentResponse, UnifiedKeyInfo } from "../../app/types";
import { generateObject } from "ai";
import { z } from "zod";
import { google } from "../ai/available-models";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const slugify = (s = "") =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

/**
 * Mock Exa enrichment provider
 */
export async function mockExaEnricher(
  deal: ManualDeal
): Promise<EnrichmentProviderResponse> {
  await sleep(120 + Math.floor(Math.random() * 200));
  const title = `Exa mock analysis — ${deal.brokerage} / ${deal.deal_caption}`;
  const raw = `Exa simulated output for deal id=${deal.id}. Revenue: ${deal.revenue}, EBITDA: ${deal.ebitda}, margin: ${deal.ebitda_margin}. Source: ${deal.source_website}`;
  const summary = `Exa finds this opportunity is a ${deal.industry} deal with ${Math.round(
    (deal.ebitda / Math.max(1, deal.revenue)) * 100
  )}% EBITDA-to-revenue ratio (mock). Recommended next step: validate owner contact and recent financials.`;
  return {
    provider: "ExaMock",
    resultTitle: title,
    rawText: raw,
    summary,
    url: `https://exa.mock/results/${deal.id}`,
    author: "Exa Research Bot",
    publishedDate: new Date().toISOString(),
    context: `Deal: ${deal.deal_caption}\nCompany location: ${deal.company_location || "N/A"}\nSource: ${deal.source_website}\n(Use this context when generating follow-up outreach)`,
  };
}

/**
 * Mock Perplexity enrichment provider
 */
export async function mockPerplexityEnricher(
  deal: ManualDeal
): Promise<EnrichmentProviderResponse> {
  await sleep(80 + Math.floor(Math.random() * 220));
  const title = `Perplexity mock summary for ${deal.brokerage}`;
  const raw = `Perplexity-style mock notes for ${deal.deal_caption}. Contact: ${deal.first_name ?? deal.first_name ?? "unknown"} ${deal.last_name ??
    deal.last_name ??
    ""}. LinkedIn: ${deal.linkedinurl ?? deal.linkedinurl ?? "none"}`;
  const summary = `${deal.deal_caption} — ${deal.industry}. Estimated scale: revenue ${deal.revenue.toLocaleString()} (mock). Follow-up: confirm email and recent revenue figures.`;
  return {
    provider: "PerplexityMock",
    resultTitle: title,
    rawText: raw,
    summary,
    url: `https://perplexity.mock/search?q=${encodeURIComponent(
      deal.deal_caption
    )}`,
    author: "Perplexity Mock Agent",
    publishedDate: new Date().toISOString(),
    context: `Search-context: "${deal.deal_caption}"\nKeyNumbers: revenue=${deal.revenue}, ebitda=${deal.ebitda}`,
  };
}

/**
 * Mock Crunchbase enrichment provider
 */
export async function mockCrunchbaseEnricher(
  deal: ManualDeal
): Promise<EnrichmentProviderResponse> {
  await sleep(140 + Math.floor(Math.random() * 260));
  const companySlug = slugify(deal.deal_caption || deal.brokerage || "company");
  const title = `Crunchbase mock profile for ${companySlug}`;
  const raw = `Crunchbase-mock profile generated for ${deal.deal_caption}. Industry tags: ${deal.industry}. Mock funding / public info not available in this demo.`;
  const summary = `Mock Crunchbase profile: ${deal.deal_caption} (${deal.industry}). Location: ${deal.company_location ||
    "N/A"}. Primary contact: ${deal.first_name ?? deal.first_name ?? "N/A"} ${
    deal.last_name ?? deal.last_name ?? ""
  }`;
  return {
    provider: "CrunchbaseMock",
    resultTitle: title,
    rawText: raw,
    summary,
    url: `https://www.crunchbase.com/organization/${companySlug}`,
    author: "Crunchbase Mock Scraper",
    publishedDate: new Date().toISOString(),
    context: `Crunchbase-style context for LLM: ${deal.deal_caption} — industry: ${deal.industry}; revenue: ${deal.revenue}; source: ${deal.source_website}`,
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
