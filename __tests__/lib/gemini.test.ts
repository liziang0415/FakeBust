const mockGenerateContent = jest.fn();
jest.mock("@google-cloud/vertexai", () => ({
  VertexAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

import { analyzeArticle } from "@/lib/gemini";

const fakeResponse = (data: object) => ({
  response: {
    candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }],
  },
});

const validResult = {
  detectedLanguage: "en",
  verdict: "FAKE",
  confidence: 85,
  summary: "The article claims vaccines caused mass deaths.",
  tone: "alarmist",
  reason: "Several key statistics in the piece can't be traced to any published source.",
  flaggedQuotes: [{ quote: "Study proves X", warning: "No such study found." }],
};

beforeEach(() => mockGenerateContent.mockResolvedValue(fakeResponse(validResult)));

test("returns parsed GeminiResult", async () => {
  const result = await analyzeArticle("Some news article text here.");
  expect(result.verdict).toBe("FAKE");
  expect(result.confidence).toBe(85);
  expect(result.detectedLanguage).toBe("en");
  expect(result.summary).toBe("The article claims vaccines caused mass deaths.");
  expect(result.tone).toBe("alarmist");
  expect(result.flaggedQuotes).toHaveLength(1);
  expect(result.flaggedQuotes[0].quote).toBe("Study proves X");
});

test("truncates text longer than 10000 chars before sending", async () => {
  const longText = "word ".repeat(4000); // 20000 chars
  await analyzeArticle(longText);
  const prompt: string = mockGenerateContent.mock.calls[0][0];
  expect(prompt.length).toBeLessThan(11000 + 600); // 10k text + prompt overhead
});

test("throws if Gemini returns invalid JSON", async () => {
  mockGenerateContent.mockResolvedValueOnce({
    response: { candidates: [{ content: { parts: [{ text: "not json" }] } }] },
  });
  await expect(analyzeArticle("text")).rejects.toThrow();
});

test("throws if response has no candidates", async () => {
  mockGenerateContent.mockResolvedValueOnce({ response: { candidates: [] } });
  await expect(analyzeArticle("text")).rejects.toThrow("Empty response from Gemini");
});
