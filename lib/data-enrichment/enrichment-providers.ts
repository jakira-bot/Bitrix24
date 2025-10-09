import { ManualDeal, EnrichmentProviderResponse } from "../../app/types";

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