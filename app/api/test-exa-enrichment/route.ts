import { enrichDealWithExa } from "@/lib/data-enrichment/exa-enrichment";
import {Timestamp} from "firebase/firestore";

// Sample ManualDeal for DataDog
const sampleDeal = {
  id: "datadog-001",
  brokerage: "NASDAQ",
  first_name: "Olivier",
  last_name: "Pomel",
  linkedinurl: "https://www.linkedin.com/in/olivierpomel/",
  work_phone: "",
  deal_caption: "Datadog Inc. - Cloud Monitoring SaaS",
  revenue: 1000000000,
  ebitda: 200000000,
  ebitda_margin: 0.2,
  gross_revenue: 1000000000,
  industry: "Software",
  source_website: "https://www.datadoghq.com/",
  company_location: "New York, NY",
  email: "",
  created_at: Timestamp.fromDate(new Date()),
};

export async function GET() {
  try {
    const enrichment = await enrichDealWithExa(sampleDeal);
    console.log("Enrichment Result:", enrichment);
    return Response.json({ enrichment });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}