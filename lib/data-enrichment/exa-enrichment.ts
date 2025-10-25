import { ManualDeal, IndividualEnrichmentResponse, EnrichmentPOC, OwnershipStructure } from "../../app/types";
import { exa } from "../ai/available-models";

/**
 * Constructs a search query from a ManualDeal object
 */
function constructSearchQuery(deal: ManualDeal): string {
  const parts: string[] = [deal.brokerage];
  
  if (deal.deal_caption) {
    parts.push(deal.deal_caption);
  }
  
  if (deal.industry) {
    parts.push(deal.industry);
  }
  
  if (deal.company_location) {
    parts.push(deal.company_location);
  }
  
  parts.push("company information");
  
  return parts.join(" ");
}

/**
 * Enrichment function using Exa search with native structured output.
 * Uses searchAndContents with summary schema to get structured data directly from Exa.
 */
export async function enrichDealWithExa(
  deal: ManualDeal
): Promise<IndividualEnrichmentResponse> {
  try {
    const searchQuery = constructSearchQuery(deal);

    // Define the schema for Exa's structured summary
    const enrichmentSchema = {
      title: "Company Enrichment Information",
      type: "object",
      properties: {
        resultTitle: {
          type: "string",
          description: "Official company name or title found"
        },
        summary: {
          type: "string",
          description: "Brief summary of the company from search results"
        },
        context: {
          type: "string",
          description: "Additional context about the company found in search results"
        },
        "employees": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "name": { "type": "string" },
              "workPhone": { "type": "string" },
              "email": { "type": "string" },
              "title": { "type": "string" },
              "linkedIn": { "type": "string" },
              "resume": { "type": "string" },
              "tags": {
                "type": "array",
                "items": { "type": "string" }
              }
            },
            "required": ["id", "name", "email"]
          },
          "description": "Employee/contact information found in search results"
        },
        "owner": {
          "type": "object",
          "properties": {
            "id": { "type": "string" },
            "name": { "type": "string" },
            "workPhone": { "type": "string" },
            "email": { "type": "string" },
            "title": { "type": "string" },
            "linkedIn": { "type": "string" },
            "resume": { "type": "string" },
            "tags": {
              "type": "array",
              "items": { "type": "string" }
            }
          },
          "required": ["id", "name", "email"],
          "description": "Owner/founder information found in search results"
        },
        "news": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Recent news about the company found in search results"
        },
        "desc": {
          "type": "string",
          "description": "Detailed company description found in search results"
        },
        "yearFounded": {
          "type": "string",
          "description": "Year the company was founded, found in search results"
        },
        "structure": {
          "type": "string",
          "enum": [
            "Sole Proprietorship",
            "Partnership",
            "LLC",
            "LLP",
            "C Corporation",
            "S Corporation",
            "Cooperative",
            "Joint Venture"
          ],
          "description": "Corporate structure found in search results"
        },
        "segment": {
          "type": "string",
          "description": "Business segment or detailed industry classification found in search results"
        },
        "extra": {
          "type": "object",
          "additionalProperties": true,
          "description": "Any additional relevant information found in search results as key-value pairs"
        }
      }
    };

    // Perform Exa search with structured summary
    const searchResults = await exa.searchAndContents(searchQuery, {
      type: "auto",
      numResults: 1,
      category: "company",
      useAutoprompt: true,
      summary: {
        schema: enrichmentSchema
      }
    });

    // Get the first result's structured summary
    const firstResult = searchResults.results[0];
    
    if (!firstResult || !firstResult.summary) {
      throw new Error("No results or summary returned from Exa");
    }

    // Parse the structured summary (Exa returns it as a JSON string)
    const structuredData = JSON.parse(firstResult.summary) as {
      resultTitle?: string | null;
      summary?: string | null;
      context?: string | null;
      employees?: EnrichmentPOC[];
      owner?: EnrichmentPOC;
      news?: string[];
      desc?: string;
      yearFounded?: string;
      structure?: OwnershipStructure;
      segment?: string;
      extra?: Record<string, any>;
    };

    // Return only the enriched data from Exa, not the original deal data
    const response: IndividualEnrichmentResponse = {
      provider: "exa",
      resultTitle: structuredData.resultTitle ?? firstResult.title ?? null,
      summary: structuredData.summary ?? null,
      url: firstResult.url,
      author: firstResult.author ?? null,
      publishedDate: firstResult.publishedDate ?? null,
      context: structuredData.context ?? null,
      employees: structuredData.employees,
      owner: structuredData.owner,
      news: structuredData.news,
      desc: structuredData.desc,
      yearFounded: structuredData.yearFounded,
      structure: structuredData.structure,
      segment: structuredData.segment,
      extra: structuredData.extra
    };

    return response;

  } catch (error) {
    console.error("Error enriching deal with Exa:", error);
    
    // Return empty response on error - no deal data included
    const errorResponse: IndividualEnrichmentResponse = {
      provider: "exa",
      resultTitle: null,
      summary: null,
      url: null,
      author: null,
      publishedDate: null,
      context: null,
      employees: undefined,
      owner: undefined,
      news: undefined,
      desc: undefined,
      yearFounded: undefined,
      structure: undefined,
      segment: undefined,
      extra: { error: error instanceof Error ? error.message : String(error) }
    };
    
    return errorResponse;
  }
}