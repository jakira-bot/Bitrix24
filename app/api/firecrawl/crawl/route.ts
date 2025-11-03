import { NextRequest, NextResponse } from "next/server";
import { crawlUrl } from "@/lib/data-enrichment/firecrawl-enrichment";
import { ManualDeal } from "@/app/types";

export async function POST(req: NextRequest) {
  try {
    const { deal, url, limit } = await req.json();

    if (!deal || !url) {
      return NextResponse.json({ error: "Missing deal or URL" }, { status: 400 });
    }

    const result = await crawlUrl(deal as ManualDeal, url, limit || 10);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in crawl route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}