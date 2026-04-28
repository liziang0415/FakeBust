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
  reason: string;
  flaggedQuotes: Array<{ quote: string; warning: string }>;
}

function buildPrompt(text: string): string {
  const truncated = text.slice(0, 10000);
  return `You are a multilingual fake news detection AI. Analyze the article below and respond ONLY with valid JSON — no markdown, no explanation outside the JSON.

JSON schema:
{
  "detectedLanguage": "<ISO 639-1 code, e.g. en, zh, ar, fr>",
  "verdict": "REAL" | "FAKE" | "UNCERTAIN",
  "confidence": <integer 0-100>,
  "reason": "<2-4 sentences in English explaining the verdict>",
  "flaggedQuotes": [
    { "quote": "<exact quote from article in its original language>", "warning": "<English explanation of the red flag>" }
  ]
}

Rules:
- Respond in JSON only. No markdown fences.
- reason must always be in English regardless of article language.
- flaggedQuotes: 1–5 most suspicious quotes. Omit array items if article appears genuine.
- If input is too short (<50 words) or clearly not a news article, set verdict to "UNCERTAIN".

Article:
${truncated}`;
}

export async function analyzeArticle(text: string): Promise<GeminiResult> {
  const model = getVertexAI().getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" },
  });
  const result = await model.generateContent(buildPrompt(text));
  const part = result.response.candidates?.[0]?.content?.parts?.[0];
  if (!part?.text) throw new Error("Empty response from Gemini");
  return JSON.parse(part.text) as GeminiResult;
}
