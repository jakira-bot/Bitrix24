import { IndividualEnrichmentResponse, UnifiedEnrichmentResponse, UnifiedKeyInfo, IndividualEnrichmentResponseSchema, EnrichmentPOC, OwnershipStructure, ManualDeal, AvailableProviders } from "../../app/types";
import { generateObject } from "ai";
import { z } from "zod";
import { enrichDealWithExa } from "./exa-enrichment";
import { enrichDealWithPerplexity } from "./perplexity-enrichment";
import { google, openai, perplexity } from "../ai/available-models";

/**
 * Selects the appropriate model for the enrichment provider.
 */
export function getModel(provider: "google" | "openai" | "perplexity") {
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
 * Constructs a detailed context string from a ManualDeal object for search context
 */
export function constructSearchContext(deal: ManualDeal): string {
  const parts: string[] = [];
  
  if (deal.brokerage) parts.push(deal.brokerage);
  if (deal.deal_caption) parts.push(deal.deal_caption);
  if (deal.industry) parts.push(deal.industry);
  if (deal.company_location) parts.push(deal.company_location);
  
  return parts.join(" ");
}

/**
 * Main enrichment function for any provider.
 * Accepts provider name and ManualDeal object, returns structured enrichment response.
 */
export async function enrichDealWithProvider(
  provider: AvailableProviders,
  deal: ManualDeal,
): Promise<IndividualEnrichmentResponse> {
  if (provider === AvailableProviders.Exa) {
    return enrichDealWithExa(deal);
  }

  if (provider === AvailableProviders.Perplexity) {
    return enrichDealWithPerplexity(deal);
  }
  
  const searchContext = constructSearchContext(deal);
  
  const prompt = `Research and enrich information about the following company/business:

${searchContext}

Extract and return ONLY NEW information you discover, not the information provided above. Return a JSON object with:
- provider: string
- resultTitle: official company name found
- summary: brief summary from your research
- url: relevant company website or source
- author: author of source material if applicable
- publishedDate: date of source material if applicable
- context: additional context discovered
- employees: array of employee/contact information found
- owner: owner/founder information found
- news: array of recent news items found
- desc: detailed company description found
- yearFounded: year founded if discovered
- structure: corporate structure type if found
- segment: detailed business segment/industry found
- extra: any other relevant information discovered

If a field cannot be found through research, set it to null.`;

  const { object } = await generateObject({
    model: getModel(provider),
    prompt,
    schema: IndividualEnrichmentResponseSchema,
  });

  return object as IndividualEnrichmentResponse;
}

