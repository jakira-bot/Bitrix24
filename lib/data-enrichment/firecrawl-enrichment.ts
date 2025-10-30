import "dotenv/config";
import Firecrawl from '@mendable/firecrawl-js';
import { ManualDeal, IndividualEnrichmentResponseSchema } from "../../app/types";

// Helper to construct a descriptive prompt for firecrawl from ManualDeal
function constructFirecrawlPrompt(deal: ManualDeal): string {
  let prompt = `Extract company enrichment information for "${deal.brokerage}"`;
  if (deal.deal_caption) prompt += `, described as "${deal.deal_caption}"`;
  if (deal.industry) prompt += ` in the "${deal.industry}" industry`;
  if (deal.company_location) prompt += `, located in "${deal.company_location}"`;
  prompt +=
    ". Only return new information not already present in the deal fields. Do not repeat deal data. Focus on enrichment fields: title, summary, context, employees, owner, news, description, year founded, structure, segment, and any extra relevant info.";
  return prompt;
}

export async function scrapeUrl(deal: ManualDeal, url: string) {
  const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

  const result = await firecrawl.scrape(url, {
    formats: [{
      type: "json",
      schema: IndividualEnrichmentResponseSchema,
      prompt: constructFirecrawlPrompt(deal)
    }]
  });

  return result.json;
}

export async function crawlUrl(deal: ManualDeal, url: string, limit = 10) {
  const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

  const crawlResponse = await firecrawl.crawl(url, {
    limit,
    scrapeOptions: {
      formats: [{
        type: "json",
        schema: IndividualEnrichmentResponseSchema,
        prompt: constructFirecrawlPrompt(deal)
      }]
    }
  });

  // Returns array of enriched data from all crawled pages
  return crawlResponse.data.map(page => page.json);
}