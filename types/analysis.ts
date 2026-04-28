// types/analysis.ts
export interface Analysis {
  _id: string;
  inputType: "text" | "url";
  originalText: string;
  sourceUrl?: string;
  detectedLanguage: string;
  verdict: "REAL" | "FAKE" | "UNCERTAIN";
  confidence: number;
  reason: string;
  flaggedQuotes: Array<{ quote: string; warning: string }>;
  createdAt: Date | string;
}

export type AnalysisSummary = Pick<
  Analysis,
  "_id" | "verdict" | "detectedLanguage" | "originalText" | "createdAt"
>;
