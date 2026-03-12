import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callGroq, parseAgentJSON } from "@/lib/groq";

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const { siteUrl, postId } = await req.json();

    if (!siteUrl) {
      return NextResponse.json({ error: "Missing siteUrl" }, { status: 400 });
    }

    const systemPrompt = `You are a KM Density Metrics Agent for a CMS. Return a knowledge health report.
   Respond ONLY with raw JSON:
   {
     "overallKMScore": 85,
     "metrics": {
       "linkDensity": { "score": 80, "value": "2.5%", "status": "good|warn|poor" },
       "conceptCoverage": { "score": 90, "value": "High", "status": "good" },
       "orphanRatio": { "score": 75, "value": "12%", "status": "warn" },
       "topicDepth": { "score": 95, "value": "Deep", "status": "good" },
       "redundancyScore": { "score": 85, "value": "Low", "status": "good" }
     },
     "knowledgeGaps": [{ "topic": "string", "priority": "high|medium|low", "suggestion": "string" }],
     "topTopics": ["string1", "string2"],
     "recommendations": ["string1", "string2"]
   }`;

    const userPrompt = `Site/Content URL to map: ${siteUrl}`;
    const resultText = await callGroq(systemPrompt, userPrompt);
    const parsed = parseAgentJSON(resultText);

    if (!parsed) throw new Error("Failed to parse AI response.");

    if (postId) {
      await prisma.kMReport.upsert({
        where: { postId },
        update: {
          siteUrl,
          overallKMScore: parsed.overallKMScore,
          metrics: JSON.stringify(parsed.metrics),
          knowledgeGaps: JSON.stringify(parsed.knowledgeGaps),
          topTopics: JSON.stringify(parsed.topTopics),
          recommendations: JSON.stringify(parsed.recommendations),
        },
        create: {
          postId,
          siteUrl,
          overallKMScore: parsed.overallKMScore,
          metrics: JSON.stringify(parsed.metrics),
          knowledgeGaps: JSON.stringify(parsed.knowledgeGaps),
          topTopics: JSON.stringify(parsed.topTopics),
          recommendations: JSON.stringify(parsed.recommendations),
        },
      });
    }

    await prisma.agentLog.create({
      data: {
        agentType: "km-density",
        postId: postId || null,
        input: siteUrl,
        status: "success",
        duration: Date.now() - start,
      },
    });

    return NextResponse.json(parsed);
  } catch (error: any) {
    await prisma.agentLog.create({
      data: {
        agentType: "km-density",
        input: "Unknown",
        status: "error",
        duration: Date.now() - start,
      },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
