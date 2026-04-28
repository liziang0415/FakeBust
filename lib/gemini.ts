// lib/gemini.ts
import { VertexAI } from "@google-cloud/vertexai";

let vertexAI: VertexAI | undefined;

function getVertexAI(): VertexAI {
  if (!vertexAI) {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    if (!project) throw new Error("GOOGLE_CLOUD_PROJECT environment variable is not set");
    vertexAI = new VertexAI({ project, location: "us-central1" });
  }
  return vertexAI;
}

export interface GeminiResult {
  detectedLanguage: string;
  verdict: "REAL" | "FAKE" | "UNCERTAIN";
  confidence: number;
  summary: string;
  tone: string;
  reason: string;
  flaggedQuotes: Array<{ quote: string; warning: string }>;
}

function buildPrompt(text: string): string {
  const truncated = text.slice(0, 10000);
  const today = new Date().toISOString().split("T")[0]; // e.g. 2026-04-29
  return `Today's date is ${today}. You are a senior fact-checking journalist fluent in all languages. Analyze the article below for misinformation. Respond ONLY with valid JSON — no markdown, no text outside the JSON.

JSON schema:
{
  "detectedLanguage": "<ISO 639-1 code, e.g. en, zh, ar, fr>",
  "verdict": "REAL" | "FAKE" | "UNCERTAIN",
  "confidence": <integer 0-100>,
  "summary": "<1-2 sentences summarising what the article claims, written neutrally>",
  "tone": "<one of: neutral | credible | sensationalist | alarmist | misleading | satirical>",
  "reason": "<3-5 sentences in natural English explaining your verdict. Write like a human journalist — be specific about which claims or patterns led to this conclusion. Vary your sentence structure. Do not start with 'This article...' or use generic AI phrasing>",
  "flaggedQuotes": [
    {
      "quote": "<exact quote from the article in its original language>",
      "warning": "<specific explanation of why this particular quote is problematic — cite evidence or explain the logical issue>"
    }
  ]
}

Rules:
- JSON only. No markdown fences.
- reason must always be in English regardless of the article's language.
- flaggedQuotes: 1–5 most suspicious quotes. Empty array if the article is credible.
- If input is too short (<50 words) or clearly not a news article, set verdict to "UNCERTAIN".

Article:
${truncated}`;
}

export async function analyzeArticle(text: string): Promise<GeminiResult> {
  const model = getVertexAI().getGenerativeModel({
    model: "gemini-2.5-pro",
    generationConfig: { responseMimeType: "application/json" },
  });
  const result = await model.generateContent(buildPrompt(text));
  const part = result.response.candidates?.[0]?.content?.parts?.[0];
  if (!part?.text) throw new Error("Empty response from Gemini");
  return JSON.parse(part.text) as GeminiResult;
}
