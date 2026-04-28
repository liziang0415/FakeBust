// app/api/analyze/route.ts
import { NextResponse } from "next/server";
import { analyzeArticle } from "@/lib/gemini";
import { fetchArticleText } from "@/lib/article-fetcher";
import { getMongoClient } from "@/lib/mongodb";
import type { Analysis } from "@/types/analysis";

export async function POST(request: Request) {
  let body: { type?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { type, content } = body;
  if (!type || !content?.trim()) {
    return NextResponse.json({ error: "type and content are required" }, { status: 400 });
  }
  if (type !== "text" && type !== "url") {
    return NextResponse.json({ error: 'type must be "text" or "url"' }, { status: 400 });
  }

  try {
    const text = type === "url" ? await fetchArticleText(content) : content;
    const result = await analyzeArticle(text);
    const id = crypto.randomUUID();

    const doc: Analysis = {
      _id: id,
      inputType: type,
      originalText: text.slice(0, 10000),
      sourceUrl: type === "url" ? content : undefined,
      detectedLanguage: result.detectedLanguage,
      verdict: result.verdict,
      confidence: result.confidence,
      summary: result.summary,
      tone: result.tone,
      reason: result.reason,
      flaggedQuotes: result.flaggedQuotes,
      createdAt: new Date(),
    };

    const client = await getMongoClient();
    await client.db("fakebuster").collection<Analysis & { _id: string }>("analyses").insertOne(doc);

    return NextResponse.json({ id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
