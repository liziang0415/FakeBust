// types/analysis.ts
export interface Analysis {
  _id: string;
  inputType: "text" | "url";
  originalText: string;
  sourceUrl?: string;
  detectedLanguage: string;
  verdict: "REAL" | "FAKE" | "UNCERTAIN";
  confidence: number;
  summary: string;
  tone: string;
  reason: string;
  flaggedQuotes: Array<{ quote: string; warning: string }>;
  /** ISO string when serialised across the RSC boundary, Date when used server-side. */
  createdAt: Date | string;
}

export type AnalysisSummary = Pick<
  Analysis,
  "_id" | "verdict" | "detectedLanguage" | "originalText" | "createdAt"
>;
