import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/data-enrichment/firecrawl-enrichment";
import { ManualDeal } from "@/app/types";

export async function POST(req: NextRequest) {
  try {
    const { deal, url } = await req.json();

    if (!deal || !url) {
      return NextResponse.json({ error: "Missing deal or URL" }, { status: 400 });
    }

    const result = await scrapeUrl(deal as ManualDeal, url);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in scrape route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}