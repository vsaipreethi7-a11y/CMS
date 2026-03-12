import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callGroq, parseAgentJSON } from "@/lib/groq";

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const { url, postId } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const systemPrompt = `You are a Content Link Discovery Agent for a CMS. Analyze a URL and return internal linking opportunities.
   Respond ONLY with raw JSON:
   {
     "pageTitle": "string",
     "pageSummary": "string",
     "linkOpportunities": [{ "anchorText": "string", "targetUrl": "string", "reason": "string", "relevanceScore": 100 }],
     "orphanRisk": "low|medium|high",
     "totalOpportunities": 0
   }`;

    const userPrompt = `URL to analyze: ${url}`;
    const resultText = await callGroq(systemPrompt, userPrompt);
    const parsed = parseAgentJSON(resultText);

    if (!parsed) throw new Error("Failed to parse AI response.");

    if (postId) {
      // Upsert the LinkAnalysis record if postId is provided
      await prisma.linkAnalysis.upsert({
        where: { postId },
        update: {
          pageTitle: parsed.pageTitle,
          pageSummary: parsed.pageSummary,
          orphanRisk: parsed.orphanRisk,
          totalOpportunities: parsed.totalOpportunities,
          opportunities: JSON.stringify(parsed.linkOpportunities),
        },
        create: {
          postId,
          pageTitle: parsed.pageTitle,
          pageSummary: parsed.pageSummary,
          orphanRisk: parsed.orphanRisk,
          totalOpportunities: parsed.totalOpportunities,
          opportunities: JSON.stringify(parsed.linkOpportunities),
        },
      });
    }

    // Agent Log
    await prisma.agentLog.create({
      data: {
        agentType: "link-discovery",
        postId: postId || null,
        input: url,
        status: "success",
        duration: Date.now() - start,
      },
    });

    return NextResponse.json(parsed);
  } catch (error: any) {
    await prisma.agentLog.create({
      data: {
        agentType: "link-discovery",
        input: "Unknown",
        status: "error",
        duration: Date.now() - start,
      },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
