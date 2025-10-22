import { Timestamp } from "firebase/firestore";
import { z } from "zod";

export type TransformedDeal = {
  brokerage: string;
  firstName?: string;
  lastName?: string;
  linkedinUrl?: string;
  email?: string;
  workPhone?: string;
  dealCaption: string;
  revenue: number;
  ebitda: number;
  ebitdaMargin: number;
  industry: string;
  sourceWebsite: string;
  companyLocation?: string; 
};

export type ManualDeal = {
  id: string; // Unique ID of the deal
  brokerage: string; // The brokerage company name
  first_name?: string; // First name of the contact (optional, as it may be missing in some rows)
  last_name?: string; // Last name of the contact (optional, as it may be missing in some rows)
  linkedinurl?: string; // LinkedIn profile URL (optional, as it may be missing in some rows)
  work_phone?: string; // Work phone number (optional, as it may be missing in some rows)
  deal_caption: string; // Description of the deal
  revenue: number; // Revenue of the deal
  ebitda: number; // EBITDA of the deal
  title?: string;
  gross_revenue?: number;
  asking_price?: number;
  ebitda_margin: number; // EBITDA margin (decimal value)
  industry: string; // Industry category of the deal
  source_website: string; // URL of the deal's source listing
  company_location?: string; // Location of the company (optional)
  created_at: Timestamp;
};

export type EvalOptions = {
  userPrompt?: string;
  sections?: string[];
  tone?: "bullet" | "narrative";
  detailLevel?: "short" | "deep";
  scale?: "0-100" | "0-10";
  language?: string;
  format?: "markdown" | "json";
  framework?: "swot" | "porter";
  temperature?: number;
};

export type BitrixDealGET = {
  id: string;
  dealCaption: string;
  revenue: number;
  ebitda: number;
  ebitdaMargin: number;
  askingPrice?: number;
  sourceWebsite: string;
  companyLocation?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  linkedinUrl?: string;
  workPhone?: string;
  brokerage: string;
  dealType: "MANUAL";
};

export type DealScreenersGET =
  | {
      id: string;
      name: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
    }[]
  | null;
// User type from Prisma Rollup relation
export interface RollupUser {
  id: string;
  name?: string | null;
  email: string;
  role?: "USER" | "ADMIN"; // matches your Prisma enum
}

// Deal type from Prisma Rollup relation
export interface RollupDeal {
  id: string;
  brokerage: string;
  firstName?: string | null;
  lastName?: string | null;
  linkedinUrl?: string | null;
  email?: string | null;
  workPhone?: string | null;
  dealCaption: string;
  revenue: number;
  ebitda: number;
  ebitdaMargin: number;
  title?: string | null;
  grossRevenue?: number | null;
  askingPrice?: number | null;
  industry: string;
  sourceWebsite: string;
  companyLocation?: string | null;
  dealTeaser?: string | null;
  bitrixLink?: string | null;
  status?: "AVAILABLE" | "SOLD" | "UNDER_CONTRACT" | "NOT_SPECIFIED";
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// Rollup type
export interface RollupDetails {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  deals: RollupDeal[];
  users: RollupUser[];
}

// API response type
export interface RollupDetailsResponse {
  rollup: RollupDetails | null;
  error?: string;
};



// User type from Prisma Rollup relation
export interface RollupUser {
  id: string;
  name?: string | null;
  email: string;
  role?: "USER" | "ADMIN"; // matches your Prisma enum
}

// Deal type from Prisma Rollup relation
export interface RollupDeal {
  id: string;
  brokerage: string;
  firstName?: string | null;
  lastName?: string | null;
  linkedinUrl?: string | null;
  email?: string | null;
  workPhone?: string | null;
  dealCaption: string;
  revenue: number;
  ebitda: number;
  ebitdaMargin: number;
  title?: string | null;
  grossRevenue?: number | null;
  askingPrice?: number | null;
  industry: string;
  sourceWebsite: string;
  companyLocation?: string | null;
  dealTeaser?: string | null;
  bitrixLink?: string | null;
  status?: "AVAILABLE" | "SOLD" | "UNDER_CONTRACT" | "NOT_SPECIFIED";
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// Rollup type
export interface RollupDetails {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  deals: RollupDeal[];
  users: RollupUser[];
}

// API response type
export interface RollupDetailsResponse {
  rollup: RollupDetails | null;
  error?: string;
};

// // Type describing the result of attempting to find deal enrichment info using a singular relevant service function
// export interface OLDEnrichmentProviderResponse {
//   provider: string; // Which ai or api is this result associated with? ie Exa or Crunchbase
//   // fields related to the result
//   resultTitle?: string | null; // title of result
//   rawText?: string | null; // raw llm output
//   summary?: string | null; // llm provided summary
//   url?: string | null; // cited source url
//   author?: string | null; // cited source author
//   publishedDate?: string | null; // ISO string
//   context?: string; // llm ready string, if available
// }  

export type UnifiedKeyInfo = {
  // chosen consensus value for the key
  value: string | number;
  // raw reported values from providers (preserve original types)
  values: Array<string | number>;
  // which providers reported this key
  providers: string[];
  // how the consensus was derived
  consensusMethod: "average" | "majority" | "single";
};

// export type OLDUnifiedEnrichmentResponse = {
//   // canonical keys mapped to info
//   unifiedKeys: Record<string, UnifiedKeyInfo>;
//   // short generated summary of the combined view
//   summary?: string;
//   // original responses included in the merge
//   sources: EnrichmentProviderResponse[];
//   generatedAt: string;
// };

export interface EnrichmentPOC {
  id: string;
  name: string;
  workPhone?: string;
  email: string;
  title?: string;
  linkedIn?: string;
  resume?: string; // string of resume if parseable
  tags?: string[];
}

export enum OwnershipStructure {
  SoleProprietorship = "Sole Proprietorship",
  Partnership = "Partnership",
  LLC = "LLC",
  LLP = "LLP",
  CorporationC = "C Corporation",
  CorporationS = "S Corporation",
  Cooperative = "Cooperative",
  JointVenture = "Joint Venture",
}

// Individual enrichment response schema
export const IndividualEnrichmentResponseSchema = z.object({
  provider: z.string(),
  resultTitle: z.string().nullable(),
  summary: z.string().nullable(),
  url: z.string().nullable(),
  author: z.string().nullable(),
  publishedDate: z.string().nullable(),
  context: z.string().nullable(),
  // Expected PE fields
  employees: z.array(z.any()).optional(),
  owner: z.any().optional(),
  news: z.array(z.string()).optional(),
  desc: z.string().optional(),
  yearFounded: z.string().optional(),
  structure: z.any().optional(),
  segment: z.string().optional(),
  // Arbitrary additional info
  extra: z.record(z.string(), z.any()).optional(),
});

export type UnifiedEnrichmentResponse = {
  // "essential" information that we should always expect (consensus/merged)
  employees?: EnrichmentPOC[];
  owner?: EnrichmentPOC;
  news?: string[];
  desc?: string;
  yearFounded?: string;
  structure?: OwnershipStructure;
  segment?: string;
  // additional arbitrary keys mapped to info (consensus/merged)
  unifiedKeys: Record<string, UnifiedKeyInfo>;
  // short generated summary of the combined view
  summary?: string;
  // original individual responses included in the merge
  sources: IndividualEnrichmentResponse[];
  // timestamp for when the unified response was generated
  generatedAt: string;
};

export type IndividualEnrichmentResponse = {
  provider: string;
  resultTitle?: string | null;
  summary?: string | null;
  url?: string | null;
  author?: string | null;
  publishedDate?: string | null;
  context?: string | null;
  // Expected PE fields
  employees?: EnrichmentPOC[];
  owner?: EnrichmentPOC;
  news?: string[];
  desc?: string;
  yearFounded?: string;
  structure?: OwnershipStructure;
  segment?: string;
  // Arbitrary additional info
  extra?: Record<string, any>;
};

