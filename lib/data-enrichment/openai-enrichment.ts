import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { ManualDeal, IndividualEnrichmentResponseSchema } from "../../app/types";

export async function enrichDealWithOpenAI(
  deal: ManualDeal
): Promise<any> {
  const searchQuery = [
    deal.brokerage,
    deal.deal_caption,
    deal.industry,
    deal.company_location,
    "company information",
  ].filter(Boolean).join(" ");

  const prompt = `Research and provide detailed information about the following company/business:

${searchQuery}

Return ONLY new information discovered from your research, not the details provided above. Structure the output as a JSON object matching this schema.`;

  const result = await generateText({
    model: openai("gpt-4o"),
    prompt,
    tools: {
      web_search: openai.tools.webSearch({
        searchContextSize: "high",
      }),
    },
    toolChoice: { type: "tool", toolName: "web_search" },
    experimental_output: Output.object({
      schema: IndividualEnrichmentResponseSchema,
    }),
    providerOptions: {
      openai: {
        textVerbosity: "high",
        reasoningSummary: "auto",
      },
    },
  });

  return result;
}