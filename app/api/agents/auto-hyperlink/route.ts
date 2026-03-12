import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callGroq, parseAgentJSON } from "@/lib/groq";

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const { content, postId } = await req.json();

    if (!content) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    const systemPrompt = `You are an Auto Hyperlinking Agent for a CMS. Inject hyperlinks into content.
   Respond ONLY with raw JSON:
   {
     "originalWordCount": 0,
     "linksInjected": 0,
     "processedHtml": "string (with <a href='url'>term</a> tags)",
     "linkMap": [{ "term": "string", "url": "string", "type": "internal|external", "category": "string" }],
     "linkDensity": 0.0
   }`;

    const userPrompt = `Content to hyperlink:\n${content}`;
    const resultText = await callGroq(systemPrompt, userPrompt);
    const parsed = parseAgentJSON(resultText);

    if (!parsed) throw new Error("Failed to parse AI response.");

    if (postId) {
      await prisma.autoHyperlink.create({
        data: {
          postId,
          originalWordCount: parsed.originalWordCount,
          linksInjected: parsed.linksInjected,
          linkDensity: parsed.linkDensity,
          processedHtml: parsed.processedHtml,
          linkMap: JSON.stringify(parsed.linkMap),
        },
      });
    }

    await prisma.agentLog.create({
      data: {
        agentType: "auto-hyperlink",
        postId: postId || null,
        input: content.substring(0, 100), // Only log prefix of content
        status: "success",
        duration: Date.now() - start,
      },
    });

    return NextResponse.json(parsed);
  } catch (error: any) {
    await prisma.agentLog.create({
      data: {
        agentType: "auto-hyperlink",
        input: "Unknown",
        status: "error",
        duration: Date.now() - start,
      },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
