"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, Sparkles, Building2, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { UnifiedEnrichmentResponse } from "@/app/types";

interface DealEnrichmentSectionProps {
  dealId: string;
}

const DealEnrichmentSection = ({ dealId }: DealEnrichmentSectionProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [enrichmentData, setEnrichmentData] = useState<UnifiedEnrichmentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const handleFetchAdditionalData = async () => {
    setIsLoading(true);
    
   //loading
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Dummy data
    const dummyData = {
      employees: [
        {
          id: "emp1",
          name: "John Smith",
          email: "john.smith@company.com",
          title: "CEO & Founder",
          workPhone: "+1-555-0123",
          linkedIn: "https://linkedin.com/in/johnsmith",
          resume: "https://example.com/resume.pdf",
          tags: ["Leadership", "Strategy", "Vision"]
        }
      ],
      owner: {
        id: "owner1",
        name: "John Smith",
        email: "john.smith@company.com",
        title: "CEO & Founder",
        workPhone: "+1-555-0123",
        linkedIn: "https://linkedin.com/in/johnsmith",
        resume: "https://example.com/resume.pdf",
        tags: ["Leadership", "Strategy", "Vision"]
      },
      news: [
        "Company raises $10M Series A funding round",
        "New product launch drives 50% revenue growth",
        "Company named 'Best Startup' by TechCrunch"
      ],
      desc: "A leading technology company specializing in innovative solutions for enterprise clients. Founded in 2018, we have grown to serve over 500 customers worldwide with our cutting-edge products and exceptional service.",
      yearFounded: "2018",
      structure: "C Corporation" as any,
      segment: "Enterprise Software & Technology",
      unifiedKeys: {
        website: { value: "https://example-company.com", values: ["https://example-company.com"], providers: ["exa"], consensusMethod: "single" as const },
        founder: { value: "John Smith", values: ["John Smith"], providers: ["exa"], consensusMethod: "single" as const },
        location: { value: "San Francisco, CA", values: ["San Francisco, CA"], providers: ["exa"], consensusMethod: "single" as const },
        employeeCount: { value: "150", values: ["150"], providers: ["exa"], consensusMethod: "single" as const },
        domain: { value: "example-company.com", values: ["example-company.com"], providers: ["exa"], consensusMethod: "single" as const },
        logo: { value: "https://via.placeholder.com/150?text=EC", values: ["https://via.placeholder.com/150?text=EC"], providers: ["exa"], consensusMethod: "single" as const }
      },
      summary: "Example Company is a fast-growing technology startup that has revolutionized the enterprise software space with innovative solutions and exceptional customer service.",
      sources: [
        {
          provider: "exa",
          url: "https://example-company.com",
          news: [
            "Company raises $10M Series A funding round",
            "New product launch drives 50% revenue growth",
            "Company named 'Best Startup' by TechCrunch"
          ],
          desc: "A leading technology company specializing in innovative solutions for enterprise clients. Founded in 2018, we have grown to serve over 500 customers worldwide with our cutting-edge products and exceptional service.",
          yearFounded: "2018",
          structure: "C Corporation" as any,
          segment: "Enterprise Software & Technology",
          extra: {
            website: "https://example-company.com",
            founder: "John Smith",
            location: "San Francisco, CA",
            employeeCount: "150",
            domain: "example-company.com",
            logo: "https://via.placeholder.com/150?text=EC"
          }
        }
      ],
      generatedAt: new Date().toISOString()
    };
    
    setEnrichmentData(dummyData);
    setHasFetched(true);
    console.log("Company information retrieved successfully!");
    setIsLoading(false);
  };

  
  const toggleExpanded = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
  };

//defaults
  const getDisplayData = () => {
    if (!enrichmentData) {
      return {
        owner: {
          name: "0",
          title: "0",
          email: "0",
          workPhone: "0",
          linkedIn: "0",
          id: "0",
          resume: "0",
          tags: []
        },
        segment: "0",
        structure: "0",
        website: "0",
        founder: "0",
        location: "0",
        employeeCount: "0",
        domain: "Exa AI Enrichment",
        logo: "0",
        news: {
          title: "0",
          links: []
        },
        founded: "0",
        description: "0"
      };
    }

    return {
      owner: {
        name: enrichmentData.owner?.name || "0",
        title: enrichmentData.owner?.title || "0",
        email: enrichmentData.owner?.email || "0",
        workPhone: enrichmentData.owner?.workPhone || "0",
        linkedIn: enrichmentData.owner?.linkedIn || "0",
        id: enrichmentData.owner?.id || "0",
        resume: enrichmentData.owner?.resume || "0",
        tags: enrichmentData.owner?.tags || []
      },
      segment: enrichmentData.segment || "0",
      structure: enrichmentData.structure || "0",
      website: enrichmentData.unifiedKeys?.website?.value || "0",
      founder: enrichmentData.unifiedKeys?.founder?.value || "0",
      location: enrichmentData.unifiedKeys?.location?.value || "0",
      employeeCount: enrichmentData.unifiedKeys?.employeeCount?.value || enrichmentData.unifiedKeys?.employees?.value || "0",
      domain: enrichmentData.sources?.[0]?.provider || "Exa AI Enrichment",
      logo: enrichmentData.unifiedKeys?.logo?.value || "0",
      news: {
        title: enrichmentData.news?.[0] || "0",
        links: (enrichmentData.news || []).map((article, index) => ({
          title: article,
          url: enrichmentData.sources?.[0]?.url,
          source: enrichmentData.sources?.[0]?.provider
        }))
      },
      founded: enrichmentData.yearFounded || "0",
      description: enrichmentData.desc || enrichmentData.summary || "0"
    };
  };

  const displayData = getDisplayData();

  return (
    <Card className="h-fit overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 dark:from-gray-900 dark:via-gray-800/50 dark:to-blue-950/30 transition-all duration-500 hover:shadow-3xl">
      <CardHeader className="relative border-b border-gradient-to-r from-primary/20 via-primary/10 to-transparent bg-gradient-to-r from-primary/5 via-primary/3 to-transparent pb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Additional Information
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Enhanced business insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${
              enrichmentData ? 'bg-green-500 animate-pulse' : 
              isLoading ? 'bg-yellow-500 animate-pulse' : 
              'bg-gray-400'
            }`}></div>
            <span className={`text-xs font-medium ${
              enrichmentData ? 'text-green-600 dark:text-green-400' : 
              isLoading ? 'text-yellow-600 dark:text-yellow-400' : 
              'text-gray-500'
            }`}>
              {enrichmentData ? 'Live Data' : isLoading ? 'Fetching...' : 'Click to Fetch'}
            </span>
          </div>
        </div>
      </CardHeader>
    
             <CardContent className="p-6 space-y-6">
               {!hasFetched && !isLoading ? (
                 /* Initial State - Click to Fetch */
                 <div className="flex flex-col items-center justify-center py-12 text-center">
                   <div className="mb-6">
                     <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                       <Sparkles className="h-10 w-10 text-primary" />
                     </div>
                     <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                       Additional Information
                     </h3>
                     <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                       Click the button below to retrieve enhanced company insights and additional business information.
                     </p>
                   </div>
                 </div>
               ) : isLoading ? (
                 /* Loading State - While Fetching */
                 <div className="flex flex-col items-center justify-center py-12 text-center">
                   <div className="mb-6">
                     <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                       <Loader2 className="h-10 w-10 text-primary animate-spin" />
                     </div>
                     <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                       Fetching Information...
                     </h3>
                     <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                       Please wait while we retrieve enhanced company insights and additional business information.
                     </p>
                   </div>
                 </div>
               ) : (
                 /* Company Overview Section - After Fetch */
                 <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Company Logo */}
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center shadow-sm">
                {displayData.logo !== "0" ? (
                  <img
                    src={String(displayData.logo)}
                    alt="Company Logo"
                    className="w-12 h-12 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                      if (nextElement) {
                        nextElement.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div className={`w-12 h-12 bg-gray-100 dark:bg-gray-600 rounded flex items-center justify-center text-gray-400 text-xs font-medium ${displayData.logo !== "0" ? 'hidden' : 'flex'}`}>
                  {"COMPANY"}
                </div>
              </div>
            </div>
          
            {/* Company Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  Company Overview
                </h3>
              </div>
            
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Founded</div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{displayData.founded}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Structure</div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{displayData.structure}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Employees</div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{displayData.employeeCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Location</div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{displayData.location}</div>
                </div>
              </div>
            
              {/* Additional Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-16">Website:</span>
                  {displayData.website !== "0" ? (
                    <a
                      href={String(displayData.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {displayData.website}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-700 dark:text-gray-300">0</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-16">Founder:</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{displayData.founder}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-16">Source:</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{displayData.domain}</span>
                </div>
              </div>

              {/* Owner Information */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mb-3">
                <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Owner:</h4>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {displayData.owner.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {displayData.owner.title}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleExpanded('owner')}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    {expandedSections.has('owner') ? 'Hide Details' : 'Show Details'}
                    <ChevronDown className={`h-3 w-3 transition-transform ${expandedSections.has('owner') ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {expandedSections.has('owner') && (
                  <div className="mt-3 space-y-2 ml-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-12">Email:</span>
                      <span className="text-xs text-gray-700 dark:text-gray-300">{displayData.owner.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-12">Phone:</span>
                      <span className="text-xs text-gray-700 dark:text-gray-300">{displayData.owner.workPhone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-12">LinkedIn:</span>
                      {displayData.owner.linkedIn !== "0" ? (
                        <a
                          href={displayData.owner.linkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {displayData.owner.linkedIn}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-700 dark:text-gray-300">0</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-12">Resume:</span>
                      {displayData.owner.resume !== "0" ? (
                        <a
                          href={displayData.owner.resume}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View Resume
                        </a>
                      ) : (
                        <span className="text-xs text-gray-700 dark:text-gray-300">0</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-12">Tags:</span>
                      <div className="flex flex-wrap gap-1">
                        {displayData.owner.tags && displayData.owner.tags.length > 0 ? (
                          displayData.owner.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded-full"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-700 dark:text-gray-300">0</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* News */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mb-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">News:</h4>
                  <button
                    onClick={() => toggleExpanded('news')}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    {expandedSections.has('news') ? 'Hide Articles' : 'Show Articles'}
                    <ChevronDown className={`h-3 w-3 transition-transform ${expandedSections.has('news') ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {expandedSections.has('news') && (
                  <div className="mt-3 space-y-2">
                    <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Related Articles:</h5>
                    {displayData.news.links.length > 0 ? (
                      displayData.news.links.map((link, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <a
                              href={link.url || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline block truncate"
                            >
                              {link.title}
                            </a>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{link.source}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-gray-700 dark:text-gray-300">0</span>
                    )}
                  </div>
                )}
              </div>
            
              {/* Description */}
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                {displayData.description}
              </p>
            
              {/* Summary */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Summary:</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {enrichmentData?.summary || "No summary available. Click 'Retrieve Company Information' to fetch enrichment data."}
                </p>
              </div>
            </div>
          </div>
        </div>
               )}
      </CardContent>

      {/* Enhanced Fetch Button */}
      <div className="p-6 pt-0">
        <Button
          className="w-full h-12 bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleFetchAdditionalData}
          disabled={isLoading}
        >
          <div className="flex items-center gap-3">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="font-semibold">
              {isLoading ? 'Fetching...' : (hasFetched ? 'Refresh Company Information' : 'Fetch Additional Information')}
            </span>
          </div>
        </Button>
      </div>
    </Card>
  );
};

export default DealEnrichmentSection;