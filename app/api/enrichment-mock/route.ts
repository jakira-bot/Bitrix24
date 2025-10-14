import { NextResponse } from "next/server";
import {
  mockExaEnricher,
  mockPerplexityEnricher,
  mockCrunchbaseEnricher,
  unifyEnrichmentResponses,
} from "@/lib/data-enrichment/enrichment-providers";

export async function GET() {
  try {
    // Call the mock enrichment providers
    const exaResponse = await mockExaEnricher();
    const perplexityResponse = await mockPerplexityEnricher();
    const crunchbaseResponse = await mockCrunchbaseEnricher();

    // Combine responses into a unified result
    const unifiedResponse = await unifyEnrichmentResponses([
      exaResponse,
      perplexityResponse,
      crunchbaseResponse,
    ]);

    // Return the unified response as JSON
    return NextResponse.json({
      success: true,
      data: unifiedResponse,
    });
  } catch (error) {
    console.error("Error in test-enrichment route:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An error occurred while testing enrichment providers.",
      },
      { status: 500 }
    );
  }
}