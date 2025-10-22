import { z } from "zod";
import { ManualDeal, IndividualEnrichmentResponse, IndividualEnrichmentResponseSchema } from "../../app/types";
import { perplexity } from "../ai/available-models";
import { generateObject } from "ai";
import { getModel, constructSearchContext } from "./general-enrichment";

/**
 * Enrichment function using Perplexity with a ManualDeal object.
 * Queries Perplexity API and structures the response.
 */
export async function enrichDealWithPerplexity(
  deal: ManualDeal
): Promise<IndividualEnrichmentResponse> {
  const searchContext = constructSearchContext(deal);
  
  const prompt = `Research and provide detailed information about the following company:

Company/Business: ${searchContext}

Please provide ONLY information you find from your research, not the information I provided. Include:
1. Official company name and detailed description
2. Key employees and their contact information (if publicly available)
3. Owner/founder information with contact details
4. Recent news about the company
5. Year founded
6. Corporate structure type
7. Detailed business segment/industry classification
8. Any other relevant information you find

Return ONLY new information discovered from your search, not the details I provided above.`;

  // Perplexity will return raw text that we then structure
  const { object } = await generateObject({
    model: getModel("perplexity"),
    prompt,
    schema: IndividualEnrichmentResponseSchema,
  });

  return {
    ...object,
    provider: "perplexity"
  } as IndividualEnrichmentResponse;
}