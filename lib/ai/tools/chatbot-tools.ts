import { tool, ToolSet } from "ai";
import { z } from "zod";
import prisma from "@/lib/prisma";

const databaseQueryTool = tool({
    description: "Search for deal information in the database. Use this tool when users ask about deals with specific criteria like EBITDA amounts, revenue, location, or other deal characteristics. You can filter by minimum/maximum EBITDA, exact revenue, company location, and EBITDA margin.",
    inputSchema: z.object({
        id: z.string().optional().describe("Specific deal ID to search for"),
        title: z.string().optional().describe("Search for deals containing this text in the title"),
        minEbitda: z.number().optional().describe("Minimum EBITDA amount (e.g., 350000 for $350k)"),
        maxEbitda: z.number().optional().describe("Maximum EBITDA amount"),
        minRevenue: z.number().optional().describe("Minimum revenue amount"),
        maxRevenue: z.number().optional().describe("Maximum revenue amount"),
        exactRevenue: z.number().optional().describe("Exact revenue amount"),
        companyLocation: z.string().optional().describe("Company location (city, state, or country)"),
        minEbitdaMargin: z.number().optional().describe("Minimum EBITDA margin percentage"),
        maxEbitdaMargin: z.number().optional().describe("Maximum EBITDA margin percentage"),
        limit: z.number().optional().default(10).describe("Maximum number of results to return"),
    }),
    outputSchema: z.string(),
    async execute({ 
        id, 
        title, 
        minEbitda, 
        maxEbitda, 
        minRevenue, 
        maxRevenue, 
        exactRevenue,
        companyLocation, 
        minEbitdaMargin,
        maxEbitdaMargin,
        limit = 10 
    }) {
        try {
            const where: any = {};
            
            // ID filter
            if (id) where.id = id;
            
            // Title filter (case-insensitive partial match)
            if (title) {
                where.title = { 
                    contains: title, 
                    mode: "insensitive" 
                };
            }
            
            // EBITDA range filter
            if (minEbitda !== undefined || maxEbitda !== undefined) {
                where.ebitda = {};
                if (minEbitda !== undefined) where.ebitda.gte = minEbitda;
                if (maxEbitda !== undefined) where.ebitda.lte = maxEbitda;
            }
            
            // Revenue filters
            if (exactRevenue !== undefined) {
                where.revenue = exactRevenue;
            } else if (minRevenue !== undefined || maxRevenue !== undefined) {
                where.revenue = {};
                if (minRevenue !== undefined) where.revenue.gte = minRevenue;
                if (maxRevenue !== undefined) where.revenue.lte = maxRevenue;
            }
            
            // Company location filter (case-insensitive partial match)
            if (companyLocation) {
                where.companyLocation = { 
                    contains: companyLocation, 
                    mode: "insensitive" 
                };
            }
            
            // EBITDA margin range filter
            if (minEbitdaMargin !== undefined || maxEbitdaMargin !== undefined) {
                where.ebitdaMargin = {};
                if (minEbitdaMargin !== undefined) where.ebitdaMargin.gte = minEbitdaMargin;
                if (maxEbitdaMargin !== undefined) where.ebitdaMargin.lte = maxEbitdaMargin;
            }

            console.log("Database query where clause:", JSON.stringify(where, null, 2));

            const deals = await prisma.deal.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    ebitda: true,
                    revenue: true,
                    companyLocation: true,
                    ebitdaMargin: true,
                    createdAt: true,
                },
                orderBy: {
                    ebitda: 'desc' // Order by EBITDA descending by default
                },
                take: limit,
            });

            console.log(`Found ${deals.length} deals matching criteria`);
            console.log(deals[0])

            if (deals.length === 0) {
                return {
                    success: false,
                    message: "No deals found matching the specified criteria.",
                    count: 0,
                    deals: []
                };
            }

            return {
                success: true,
                message: `Found ${deals.length} deal(s) matching your criteria.`,
                count: deals.length,
                deals: deals.map(deal => ({
                    ...deal,
                    ebitda: deal.ebitda ? `$${deal.ebitda.toLocaleString()}` : 'N/A',
                    revenue: deal.revenue ? `$${deal.revenue.toLocaleString()}` : 'N/A',
                    ebitdaMargin: deal.ebitdaMargin ? `${deal.ebitdaMargin}%` : 'N/A',
                }))
            };
        } catch (error) {
            console.error("❌ Database query error:", error);
            return {
                success: false,
                message: "An error occurred while searching for deals.",
                error: error instanceof Error ? error.message : "Unknown error",
                count: 0,
                deals: []
            };
        }
    },
});

export const tools = {
    databaseQueryTool
} satisfies ToolSet;