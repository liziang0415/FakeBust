# FakeBuster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a free, multilingual AI-powered fake news detector web app using Next.js, Gemini 2.0 Flash, and MongoDB Atlas.

**Architecture:** Next.js 15 App Router with TypeScript and Tailwind CSS. Server-side API routes call Gemini and read/write MongoDB. Each analysis is saved with a UUID and accessible at `/report/[id]` as a permanent shareable URL.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, `@google/generative-ai`, `mongodb`, `cheerio`, Jest, Vercel (deploy), MongoDB Atlas M0 (free), Gemini 2.0 Flash (free tier)

---

## File Map

| File | Responsibility |
|---|---|
| `types/analysis.ts` | `Analysis` TypeScript interface — single source of truth for the data shape |
| `lib/mongodb.ts` | MongoDB client singleton — one connection across hot-reload |
| `lib/gemini.ts` | Gemini prompt builder + `analyzeArticle()` — returns `GeminiResult` |
| `lib/article-fetcher.ts` | `fetchArticleText(url)` — fetch HTML, extract article text with cheerio |
| `app/api/analyze/route.ts` | `POST /api/analyze` — orchestrates fetching + Gemini + MongoDB save |
| `app/api/report/[id]/route.ts` | `GET /api/report/[id]` — returns stored analysis or 404 |
| `app/api/recent/route.ts` | `GET /api/recent` — returns last 10 analyses (summary fields only) |
| `app/page.tsx` | Home — renders `<InputTabs />` and `<RecentAnalyses />` |
| `app/report/[id]/page.tsx` | Report — fetches and renders full analysis |
| `app/layout.tsx` | Root layout — font, metadata |
| `components/InputTabs.tsx` | Client component — tab state, form, loading, POST → redirect |
| `components/VerdictBadge.tsx` | Verdict color badge + confidence bar + language pill |
| `components/FlaggedQuote.tsx` | Single flagged quote card — original quote + English warning |
| `components/RecentAnalyses.tsx` | Client component — fetches `/api/recent`, renders colored list |
| `__tests__/lib/gemini.test.ts` | Unit tests for `analyzeArticle` (mocked Gemini SDK) |
| `__tests__/lib/article-fetcher.test.ts` | Unit tests for `fetchArticleText` (mocked `fetch`) |
| `.env.local` | `GEMINI_API_KEY`, `MONGODB_URI`, `NEXT_PUBLIC_BASE_URL` |
| `.env.local.example` | Template — safe to commit |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts` (via create-next-app)
- Create: `jest.config.ts`
- Create: `.env.local`, `.env.local.example`

- [ ] **Step 1.1: Initialize Next.js project**

  > If `/Users/paulli/Home/Project` already has files (e.g. this plan), answer **Yes** when create-next-app asks "Would you like to proceed?"

  ```bash
  cd /Users/paulli/Home/Project
  npx create-next-app@latest . --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*" --yes
  ```

  Expected: project files created, `npm run dev` works.

- [ ] **Step 1.2: Install runtime dependencies**

  ```bash
  cd /Users/paulli/Home/Project
  npm install mongodb @google/generative-ai cheerio
  ```

- [ ] **Step 1.3: Install test dependencies**

  ```bash
  npm install -D jest @types/jest ts-jest jest-environment-node
  ```

- [ ] **Step 1.4: Create jest.config.ts**

  ```typescript
  // jest.config.ts
  import type { Config } from "jest";
  import nextJest from "next/jest.js";

  const createJestConfig = nextJest({ dir: "./" });

  const config: Config = {
    testEnvironment: "node",
    moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
    testMatch: ["**/__tests__/**/*.test.ts"],
  };

  export default createJestConfig(config);
  ```

- [ ] **Step 1.5: Create environment files**

  Create `.env.local` (never commit):
  ```
  GEMINI_API_KEY=your_key_here
  MONGODB_URI=your_mongodb_atlas_uri_here
  NEXT_PUBLIC_BASE_URL=http://localhost:3000
  ```

  Create `.env.local.example` (safe to commit):
  ```
  GEMINI_API_KEY=
  MONGODB_URI=
  NEXT_PUBLIC_BASE_URL=http://localhost:3000
  ```

- [ ] **Step 1.6: Ensure .env.local is gitignored**

  Check `.gitignore` contains `.env.local`. If not, add it:
  ```bash
  grep -q "\.env\.local" .gitignore || echo ".env.local" >> .gitignore
  ```

- [ ] **Step 1.7: Verify dev server starts**

  ```bash
  npm run dev &
  sleep 3 && curl -s http://localhost:3000 | grep -q "html" && echo "OK" && kill %1
  ```

  Expected output: `OK`

- [ ] **Step 1.8: Commit**

  ```bash
  git add -A
  git commit -m "chore: scaffold Next.js 15 project with Tailwind and Jest"
  ```

---

## Task 2: Types and MongoDB Connection

**Files:**
- Create: `types/analysis.ts`
- Create: `lib/mongodb.ts`

- [ ] **Step 2.1: Create Analysis type**

  ```typescript
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
  ```

- [ ] **Step 2.2: Create MongoDB singleton**

  ```typescript
  // lib/mongodb.ts
  import { MongoClient } from "mongodb";

  const uri = process.env.MONGODB_URI!;
  if (!uri) throw new Error("MONGODB_URI is not set");

  let clientPromise: Promise<MongoClient>;

  declare global {
    var _mongoClientPromise: Promise<MongoClient> | undefined;
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    clientPromise = new MongoClient(uri).connect();
  }

  export default clientPromise;
  ```

- [ ] **Step 2.3: Verify MongoDB connects (requires .env.local set)**

  ```bash
  node -e "
  require('dotenv').config({ path: '.env.local' });
  const { MongoClient } = require('mongodb');
  new MongoClient(process.env.MONGODB_URI).connect()
    .then(c => { console.log('MongoDB OK'); c.close(); })
    .catch(e => { console.error('MongoDB FAIL:', e.message); process.exit(1); });
  "
  ```

  Expected: `MongoDB OK`

- [ ] **Step 2.4: Commit**

  ```bash
  git add types/analysis.ts lib/mongodb.ts
  git commit -m "feat: add Analysis type and MongoDB connection singleton"
  ```

---

## Task 3: Gemini Integration

**Files:**
- Create: `lib/gemini.ts`
- Create: `__tests__/lib/gemini.test.ts`

- [ ] **Step 3.1: Write the failing tests**

  ```typescript
  // __tests__/lib/gemini.test.ts
  const mockGenerateContent = jest.fn();
  jest.mock("@google/generative-ai", () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    })),
  }));

  import { analyzeArticle } from "@/lib/gemini";

  const fakeResponse = (data: object) => ({
    response: { text: () => JSON.stringify(data) },
  });

  const validResult = {
    detectedLanguage: "en",
    verdict: "FAKE",
    confidence: 85,
    reason: "This article contains unverified claims.",
    flaggedQuotes: [{ quote: "Study proves X", warning: "No such study found." }],
  };

  beforeEach(() => mockGenerateContent.mockResolvedValue(fakeResponse(validResult)));

  test("returns parsed GeminiResult", async () => {
    const result = await analyzeArticle("Some news article text here.");
    expect(result.verdict).toBe("FAKE");
    expect(result.confidence).toBe(85);
    expect(result.detectedLanguage).toBe("en");
    expect(result.flaggedQuotes).toHaveLength(1);
    expect(result.flaggedQuotes[0].quote).toBe("Study proves X");
  });

  test("truncates text longer than 10000 chars before sending", async () => {
    const longText = "word ".repeat(4000); // 20000 chars
    await analyzeArticle(longText);
    const prompt: string = mockGenerateContent.mock.calls[0][0];
    // Prompt contains the article; total length should be manageable
    expect(prompt.length).toBeLessThan(11000 + 600); // 10k text + prompt overhead
  });

  test("throws if Gemini returns invalid JSON", async () => {
    mockGenerateContent.mockResolvedValueOnce({ response: { text: () => "not json" } });
    await expect(analyzeArticle("text")).rejects.toThrow();
  });
  ```

- [ ] **Step 3.2: Run tests — confirm they fail**

  ```bash
  npx jest __tests__/lib/gemini.test.ts --no-coverage 2>&1 | tail -5
  ```

  Expected: `Cannot find module '@/lib/gemini'`

- [ ] **Step 3.3: Implement lib/gemini.ts**

  ```typescript
  // lib/gemini.ts
  import { GoogleGenerativeAI } from "@google/generative-ai";

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { responseMimeType: "application/json" },
    });
    const result = await model.generateContent(buildPrompt(text));
    return JSON.parse(result.response.text()) as GeminiResult;
  }
  ```

- [ ] **Step 3.4: Run tests — confirm they pass**

  ```bash
  npx jest __tests__/lib/gemini.test.ts --no-coverage
  ```

  Expected: `Tests: 3 passed`

- [ ] **Step 3.5: Commit**

  ```bash
  git add lib/gemini.ts __tests__/lib/gemini.test.ts
  git commit -m "feat: add Gemini integration with JSON-mode prompt"
  ```

---

## Task 4: Article URL Fetcher

**Files:**
- Create: `lib/article-fetcher.ts`
- Create: `__tests__/lib/article-fetcher.test.ts`

- [ ] **Step 4.1: Write the failing tests**

  ```typescript
  // __tests__/lib/article-fetcher.test.ts
  const mockFetch = jest.fn();
  global.fetch = mockFetch as typeof fetch;

  import { fetchArticleText } from "@/lib/article-fetcher";

  beforeEach(() => mockFetch.mockReset());

  const htmlWith = (body: string) => ({
    ok: true,
    text: async () => `<html><body>${body}</body></html>`,
  });

  test("extracts text from <article> tag", async () => {
    mockFetch.mockResolvedValue(htmlWith(
      "<article><p>Breaking news: scientists discover water on Mars.</p></article>"
    ));
    const text = await fetchArticleText("https://example.com/story");
    expect(text).toContain("Breaking news");
    expect(text).toContain("water on Mars");
  });

  test("falls back to <main> when no <article>", async () => {
    mockFetch.mockResolvedValue(htmlWith(
      "<main><p>" + "word ".repeat(30) + "</p></main>"
    ));
    const text = await fetchArticleText("https://example.com/story");
    expect(text.length).toBeGreaterThan(50);
  });

  test("throws on HTTP error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    await expect(fetchArticleText("https://example.com/404")).rejects.toThrow("HTTP 404");
  });

  test("throws when extracted text is too short", async () => {
    mockFetch.mockResolvedValue(htmlWith("<p>Hi.</p>"));
    await expect(fetchArticleText("https://example.com/empty")).rejects.toThrow(
      "Could not extract article text"
    );
  });

  test("throws on fetch timeout/abort", async () => {
    mockFetch.mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    await expect(fetchArticleText("https://example.com/slow")).rejects.toThrow();
  });
  ```

- [ ] **Step 4.2: Run tests — confirm they fail**

  ```bash
  npx jest __tests__/lib/article-fetcher.test.ts --no-coverage 2>&1 | tail -5
  ```

  Expected: `Cannot find module '@/lib/article-fetcher'`

- [ ] **Step 4.3: Implement lib/article-fetcher.ts**

  ```typescript
  // lib/article-fetcher.ts
  import * as cheerio from "cheerio";

  export async function fetchArticleText(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 FakeBuster/1.0" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const html = await res.text();
      const $ = cheerio.load(html);
      $("script, style, nav, footer, header, aside, .ad, .advertisement, [aria-hidden='true']").remove();

      const text =
        $("article").text().trim() ||
        $("main").text().trim() ||
        $('[role="main"]').text().trim() ||
        $("body").text().trim();

      const cleaned = text.replace(/\s+/g, " ").trim();
      if (cleaned.length < 100) throw new Error("Could not extract article text from this URL");
      return cleaned;
    } finally {
      clearTimeout(timeout);
    }
  }
  ```

- [ ] **Step 4.4: Run tests — confirm they pass**

  ```bash
  npx jest __tests__/lib/article-fetcher.test.ts --no-coverage
  ```

  Expected: `Tests: 5 passed`

- [ ] **Step 4.5: Commit**

  ```bash
  git add lib/article-fetcher.ts __tests__/lib/article-fetcher.test.ts
  git commit -m "feat: add article URL fetcher with cheerio extraction"
  ```

---

## Task 5: API Routes

**Files:**
- Create: `app/api/analyze/route.ts`
- Create: `app/api/report/[id]/route.ts`
- Create: `app/api/recent/route.ts`

- [ ] **Step 5.1: Create POST /api/analyze**

  ```typescript
  // app/api/analyze/route.ts
  import { NextResponse } from "next/server";
  import { analyzeArticle } from "@/lib/gemini";
  import { fetchArticleText } from "@/lib/article-fetcher";
  import clientPromise from "@/lib/mongodb";
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
        reason: result.reason,
        flaggedQuotes: result.flaggedQuotes,
        createdAt: new Date(),
      };

      const client = await clientPromise;
      await client.db("fakebuster").collection<Analysis>("analyses").insertOne(doc as any);

      return NextResponse.json({ id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
  ```

- [ ] **Step 5.2: Create GET /api/report/[id]**

  ```typescript
  // app/api/report/[id]/route.ts
  import { NextResponse } from "next/server";
  import clientPromise from "@/lib/mongodb";

  export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    try {
      const client = await clientPromise;
      const doc = await client
        .db("fakebuster")
        .collection("analyses")
        .findOne({ _id: id });
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(doc);
    } catch {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }
  ```

- [ ] **Step 5.3: Create GET /api/recent**

  ```typescript
  // app/api/recent/route.ts
  import { NextResponse } from "next/server";
  import clientPromise from "@/lib/mongodb";

  export async function GET() {
    try {
      const client = await clientPromise;
      const docs = await client
        .db("fakebuster")
        .collection("analyses")
        .find(
          {},
          { projection: { _id: 1, verdict: 1, detectedLanguage: 1, originalText: 1, createdAt: 1 } }
        )
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();
      return NextResponse.json(docs);
    } catch {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }
  ```

- [ ] **Step 5.4: Smoke-test the analyze route (dev server must be running)**

  ```bash
  npm run dev &
  sleep 4
  curl -s -X POST http://localhost:3000/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"type":"text","content":"COVID vaccines have killed millions according to anonymous sources."}' \
    | python3 -m json.tool
  kill %1
  ```

  Expected: `{ "id": "<uuid>" }`

- [ ] **Step 5.5: Commit**

  ```bash
  git add app/api/
  git commit -m "feat: add analyze, report, and recent API routes"
  ```

---

## Task 6: Home Page UI

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Create: `components/InputTabs.tsx`
- Create: `components/RecentAnalyses.tsx`

- [ ] **Step 6.1: Update app/layout.tsx**

  ```typescript
  // app/layout.tsx
  import type { Metadata } from "next";
  import { Geist } from "next/font/google";
  import "./globals.css";

  const geist = Geist({ subsets: ["latin"] });

  export const metadata: Metadata = {
    title: "FakeBuster — AI Fake News Detector",
    description: "Detect fake news in any language, powered by Google Gemini AI",
  };

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en">
        <body className={`${geist.className} bg-gray-50 text-gray-900`}>{children}</body>
      </html>
    );
  }
  ```

- [ ] **Step 6.2: Create components/InputTabs.tsx**

  ```typescript
  // components/InputTabs.tsx
  "use client";

  import { useState } from "react";
  import { useRouter } from "next/navigation";

  type Tab = "text" | "url";

  export default function InputTabs() {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>("text");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!content.trim()) return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: tab, content }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Analysis failed");
        router.push(`/report/${data.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setLoading(false);
      }
    }

    return (
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          {(["text", "url"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setContent(""); setError(null); }}
              className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "text" ? "Paste Text" : "URL"}
            </button>
          ))}
        </div>

        {/* Input */}
        {tab === "text" ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste the article text or headline here (any language)..."
            rows={5}
            className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        ) : (
          <input
            type="url"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="https://news-site.com/article..."
            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        )}

        {/* Error */}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {loading ? "Analyzing…" : "Analyze →"}
        </button>
      </form>
    );
  }
  ```

- [ ] **Step 6.3: Create components/RecentAnalyses.tsx**

  ```typescript
  // components/RecentAnalyses.tsx
  "use client";

  import { useEffect, useState } from "react";
  import Link from "next/link";
  import type { AnalysisSummary } from "@/types/analysis";

  const verdictColor: Record<string, string> = {
    FAKE: "bg-red-50 border-red-200",
    REAL: "bg-green-50 border-green-200",
    UNCERTAIN: "bg-yellow-50 border-yellow-200",
  };

  const verdictIcon: Record<string, string> = {
    FAKE: "🔴",
    REAL: "🟢",
    UNCERTAIN: "🟡",
  };

  function timeAgo(date: string | Date): string {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  export default function RecentAnalyses() {
    const [items, setItems] = useState<AnalysisSummary[]>([]);

    useEffect(() => {
      fetch("/api/recent")
        .then((r) => r.json())
        .then((data) => Array.isArray(data) && setItems(data))
        .catch(() => {});
    }, []);

    if (items.length === 0) return null;

    return (
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Recent Analyses</p>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item._id}>
              <Link
                href={`/report/${item._id}`}
                className={`flex justify-between items-center px-3 py-2 rounded-lg border text-sm ${verdictColor[item.verdict] ?? "bg-gray-50 border-gray-200"} hover:opacity-80 transition-opacity`}
              >
                <span className="truncate max-w-xs">
                  {verdictIcon[item.verdict]} {item.originalText.slice(0, 60)}…
                  <span className="ml-2 text-xs text-gray-400 uppercase">{item.detectedLanguage}</span>
                </span>
                <span className="text-xs text-gray-400 shrink-0 ml-3">{timeAgo(item.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  ```

- [ ] **Step 6.4: Update app/page.tsx**

  ```typescript
  // app/page.tsx
  import InputTabs from "@/components/InputTabs";
  import RecentAnalyses from "@/components/RecentAnalyses";

  export default function Home() {
    return (
      <main className="min-h-screen py-16 px-4">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold tracking-tight mb-2">🔍 FakeBuster</h1>
            <p className="text-gray-500">Detect fake news in any language — powered by Gemini AI</p>
          </div>
          <InputTabs />
          <RecentAnalyses />
        </div>
      </main>
    );
  }
  ```

- [ ] **Step 6.5: Verify home page renders**

  ```bash
  npm run dev &
  sleep 4
  curl -s http://localhost:3000 | grep -q "FakeBuster" && echo "HOME OK"
  kill %1
  ```

  Expected: `HOME OK`

- [ ] **Step 6.6: Commit**

  ```bash
  git add app/page.tsx app/layout.tsx components/
  git commit -m "feat: add home page with tabbed input and recent analyses"
  ```

---

## Task 7: Report Page UI

**Files:**
- Create: `components/VerdictBadge.tsx`
- Create: `components/FlaggedQuote.tsx`
- Create: `app/report/[id]/page.tsx`

- [ ] **Step 7.1: Create components/VerdictBadge.tsx**

  ```typescript
  // components/VerdictBadge.tsx
  type Verdict = "REAL" | "FAKE" | "UNCERTAIN";

  const styles: Record<Verdict, { badge: string; bar: string; label: string }> = {
    FAKE: { badge: "bg-red-100 text-red-700", bar: "bg-red-500", label: "LIKELY FAKE" },
    REAL: { badge: "bg-green-100 text-green-700", bar: "bg-green-500", label: "LIKELY REAL" },
    UNCERTAIN: { badge: "bg-yellow-100 text-yellow-700", bar: "bg-yellow-500", label: "UNCERTAIN" },
  };

  interface Props {
    verdict: Verdict;
    confidence: number;
    detectedLanguage: string;
  }

  export default function VerdictBadge({ verdict, confidence, detectedLanguage }: Props) {
    const s = styles[verdict] ?? styles.UNCERTAIN;
    return (
      <div className="text-center mb-8">
        <span className={`inline-block px-6 py-2 rounded-full font-bold text-lg ${s.badge}`}>
          {s.label}
        </span>
        <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div className={`h-2.5 rounded-full ${s.bar}`} style={{ width: `${confidence}%` }} />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {confidence}% confidence &middot; Language: <span className="uppercase font-medium">{detectedLanguage}</span>
        </p>
      </div>
    );
  }
  ```

- [ ] **Step 7.2: Create components/FlaggedQuote.tsx**

  ```typescript
  // components/FlaggedQuote.tsx
  interface Props {
    quote: string;
    warning: string;
  }

  export default function FlaggedQuote({ quote, warning }: Props) {
    return (
      <div className="border border-red-200 rounded-lg p-4 bg-white">
        <p className="italic text-gray-700 text-sm mb-2">"{quote}"</p>
        <p className="text-red-600 text-sm flex gap-1.5">
          <span>⚠️</span>
          <span>{warning}</span>
        </p>
      </div>
    );
  }
  ```

- [ ] **Step 7.3: Create app/report/[id]/page.tsx**

  ```typescript
  // app/report/[id]/page.tsx
  import Link from "next/link";
  import { notFound } from "next/navigation";
  import VerdictBadge from "@/components/VerdictBadge";
  import FlaggedQuote from "@/components/FlaggedQuote";
  import type { Analysis } from "@/types/analysis";

  interface Props {
    params: Promise<{ id: string }>;
  }

  async function getAnalysis(id: string): Promise<Analysis | null> {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/report/${id}`, { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Failed to load report");
    return res.json();
  }

  export default async function ReportPage({ params }: Props) {
    const { id } = await params;
    const analysis = await getAnalysis(id);
    if (!analysis) notFound();

    const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/report/${id}`;

    return (
      <main className="min-h-screen py-16 px-4">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <Link href="/" className="text-indigo-600 text-sm hover:underline">← Back to FakeBuster</Link>
            <button
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              📋 Copy Link
            </button>
          </div>

          {/* Verdict */}
          <VerdictBadge
            verdict={analysis.verdict as "REAL" | "FAKE" | "UNCERTAIN"}
            confidence={analysis.confidence}
            detectedLanguage={analysis.detectedLanguage}
          />

          {/* Why */}
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Why</h2>
            <div className="border-l-4 border-indigo-400 pl-4 text-gray-700 text-sm leading-relaxed">
              {analysis.reason}
            </div>
          </section>

          {/* Flagged Quotes */}
          {analysis.flaggedQuotes.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                Flagged Quotes ({analysis.flaggedQuotes.length})
              </h2>
              <div className="flex flex-col gap-3">
                {analysis.flaggedQuotes.map((fq, i) => (
                  <FlaggedQuote key={i} quote={fq.quote} warning={fq.warning} />
                ))}
              </div>
            </section>
          )}

          {/* Source URL if from URL input */}
          {analysis.sourceUrl && (
            <p className="mt-8 text-xs text-gray-400">
              Source: <a href={analysis.sourceUrl} className="underline" target="_blank" rel="noopener noreferrer">{analysis.sourceUrl}</a>
            </p>
          )}
        </div>
      </main>
    );
  }
  ```

  > Note: The "Copy Link" button uses `onClick` which requires `"use client"`. Extract it into a `<CopyButton />` client component if Next.js warns about `onClick` in a Server Component.

- [ ] **Step 7.4: Extract CopyButton as client component (if needed)**

  If the build gives an `onClick` error, create:

  ```typescript
  // components/CopyButton.tsx
  "use client";

  export default function CopyButton({ url }: { url: string }) {
    return (
      <button
        onClick={() => navigator.clipboard.writeText(url)}
        className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
      >
        📋 Copy Link
      </button>
    );
  }
  ```

  Then in `app/report/[id]/page.tsx`, replace the inline button with `<CopyButton url={shareUrl} />`.

- [ ] **Step 7.5: Verify report page renders end-to-end**

  ```bash
  npm run dev &
  sleep 4
  ID=$(curl -s -X POST http://localhost:3000/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"type":"text","content":"Breaking: Scientists confirm that drinking bleach cures cancer according to anonymous doctors. The WHO has confirmed this revolutionary treatment."}' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
  echo "Report URL: http://localhost:3000/report/$ID"
  curl -s "http://localhost:3000/report/$ID" | grep -q "FakeBuster" && echo "REPORT PAGE OK"
  kill %1
  ```

  Expected: `REPORT PAGE OK` and a valid report URL to open in browser.

- [ ] **Step 7.6: Commit**

  ```bash
  git add components/VerdictBadge.tsx components/FlaggedQuote.tsx app/report/
  git commit -m "feat: add report page with verdict, reasoning, and flagged quotes"
  ```

---

## Task 8: Polish and Deploy

**Files:**
- Modify: `app/globals.css` (minor tweaks if needed)
- Create: `.env.local.example`
- Modify: `next.config.ts`

- [ ] **Step 8.1: Add MongoDB index for createdAt (run once)**

  ```bash
  node -e "
  require('dotenv').config({ path: '.env.local' });
  const { MongoClient } = require('mongodb');
  new MongoClient(process.env.MONGODB_URI).connect().then(async c => {
    await c.db('fakebuster').collection('analyses').createIndex({ createdAt: -1 });
    console.log('Index created');
    await c.close();
  });
  "
  ```

- [ ] **Step 8.2: Run full test suite — all must pass**

  ```bash
  npx jest --no-coverage
  ```

  Expected: all tests pass.

- [ ] **Step 8.3: Run production build locally**

  ```bash
  npm run build 2>&1 | tail -20
  ```

  Expected: `✓ Compiled successfully` with no type errors.

- [ ] **Step 8.4: Push to GitHub**

  ```bash
  git remote add origin https://github.com/liziang0415/FakeBuster-.git
  git branch -M main
  git push -u origin main
  ```

- [ ] **Step 8.5: Deploy on Vercel**

  1. Go to https://vercel.com/new → Import the `FakeBuster-` repo
  2. In **Environment Variables**, add:
     - `GEMINI_API_KEY` = (your Google AI Studio key)
     - `MONGODB_URI` = (your Atlas connection string)
     - `NEXT_PUBLIC_BASE_URL` = `https://<your-vercel-url>.vercel.app`
  3. Click **Deploy**

- [ ] **Step 8.6: Smoke test the live URL**

  ```bash
  LIVE=https://<your-vercel-url>.vercel.app
  ID=$(curl -s -X POST $LIVE/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"type":"text","content":"Exclusive: 5G towers confirmed to spread COVID-19 according to whistleblowers. Governments are hiding the truth."}' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
  echo "Live report: $LIVE/report/$ID"
  ```

  Expected: valid UUID returned; opening the URL in a browser shows a FAKE verdict with flagged quotes.

- [ ] **Step 8.7: Final commit**

  ```bash
  git add .
  git commit -m "chore: add MongoDB index and deployment config"
  git push
  ```

---

## Verification Checklist

| Test | How to verify |
|---|---|
| English fake article | Paste text → expect FAKE verdict + English flagged quotes |
| Chinese article | Paste Chinese text → `detectedLanguage: zh`, English `reason`, Chinese quotes |
| Arabic article | Paste Arabic text → `detectedLanguage: ar`, English `reason`, Arabic quotes |
| URL input | Enter BBC/Reuters URL → article fetched + analyzed |
| Shareable link | Copy `/report/[id]`, open in incognito → same report |
| Recent list | Submit 3 analyses → all 3 in home page list |
| Error: bad URL | Enter broken URL → friendly error message, no crash |
| Error: empty input | Click Analyze with empty field → button stays disabled |

---

## Environment Variables Reference

```
GEMINI_API_KEY=        # Google AI Studio → Create API key (free)
MONGODB_URI=           # Atlas → Connect → Drivers → Node.js connection string
NEXT_PUBLIC_BASE_URL=  # https://<app>.vercel.app (or http://localhost:3000 locally)
```
