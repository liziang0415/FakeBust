# FakeBuster — Session Summary

## What We Built

**FakeBuster** — a free, multilingual AI-powered fake news detector.  
GitHub: https://github.com/liziang0415/FakeBuster-  
Stack: Next.js 16 · TypeScript · Tailwind CSS · Gemini 2.5 Pro · MongoDB Atlas · Google Cloud Run

---

## Design & Plan Documents

| Document | Path |
|---|---|
| Implementation plan (detailed, with code) | `docs/superpowers/plans/2026-04-29-fakebuster.md` |
| High-level design spec (brainstormed) | `/Users/paulli/.claude/plans/i-want-to-build-snuggly-ripple.md` |
| README (setup + deploy guide) | `README.md` |

---

## Project Structure

```
fakebuster/
├── app/
│   ├── page.tsx                    # Home — tabbed input + recent analyses
│   ├── layout.tsx                  # Root layout, Geist font, metadata
│   ├── globals.css
│   └── report/[id]/page.tsx        # Report — verdict, tone, summary, flagged quotes
│   └── api/
│       ├── analyze/route.ts        # POST — runs Gemini, saves to MongoDB
│       ├── report/[id]/route.ts    # GET — fetch stored analysis
│       └── recent/route.ts         # GET — last 10 analyses
├── components/
│   ├── InputTabs.tsx               # Text/URL tab switcher + form
│   ├── VerdictBadge.tsx            # REAL/FAKE/UNCERTAIN badge + confidence bar
│   ├── FlaggedQuote.tsx            # Quoted text + warning card
│   ├── RecentAnalyses.tsx          # Home page recent list
│   └── CopyButton.tsx              # Clipboard share button (client component)
├── lib/
│   ├── gemini.ts                   # Vertex AI Gemini 2.5 Pro integration
│   ├── mongodb.ts                  # Lazy MongoDB connection (getMongoClient)
│   └── article-fetcher.ts          # URL → article text via cheerio
├── types/
│   └── analysis.ts                 # Analysis + AnalysisSummary TypeScript types
├── __tests__/lib/
│   ├── gemini.test.ts              # 4 unit tests (mocked Vertex AI)
│   └── article-fetcher.test.ts    # 5 unit tests (mocked fetch)
├── Dockerfile                      # Multi-stage build, Node 20 Alpine, port 8080
├── cloudbuild.yaml                 # Cloud Build config (fixes trailing-hyphen tag bug)
├── next.config.ts                  # standalone output for Docker
├── jest.config.ts                  # Next.js SWC transformer, @/* alias
└── .env.local.example              # GOOGLE_CLOUD_PROJECT, MONGODB_URI
```

---

## Progress Made This Session

### Phase 1 — Design & Planning
- Brainstormed the full product through visual mockups (platform, input method, results layout, architecture)
- Decided: web app, tabbed text/URL input, redirect-to-report flow, MongoDB shareable links
- Wrote detailed implementation plan with code at `docs/superpowers/plans/2026-04-29-fakebuster.md`

### Phase 2 — Implementation (8 tasks via subagent-driven development)
1. **Scaffolded Next.js 15** with TypeScript, Tailwind, Jest
2. **Created types + MongoDB** — `Analysis` interface, lazy `getMongoClient()` singleton
3. **Gemini integration** — TDD, JSON-mode prompt, `GeminiResult` interface
4. **Article URL fetcher** — TDD, cheerio extraction, 5 tests
5. **API routes** — `/api/analyze`, `/api/report/[id]`, `/api/recent`
6. **Home page UI** — `InputTabs`, `RecentAnalyses`, tabbed form with loading state
7. **Report page UI** — `VerdictBadge`, `FlaggedQuote`, `CopyButton`, full report layout
8. **Polish + deploy prep** — README, env examples, pushed to GitHub

### Phase 3 — Upgrades
- **Switched to Vertex AI SDK** (ADC auth, no API key needed) — `@google-cloud/vertexai`
- **Upgraded to Gemini 2.5 Pro** — stronger model, better reasoning
- **Richer prompt** — journalist-style tone, `summary` + `tone` fields added to analysis
- **Date injection** — current date passed to prompt so model doesn't flag 2026 news as future

### Phase 4 — Cloud Run Deployment (many fixes)
| Issue | Fix |
|---|---|
| Vertex AI 401 | `gcloud auth application-default login` |
| Vertex AI 403 | Enabled `aiplatform.googleapis.com` API + set quota project |
| Vertex AI 404 | Model name `gemini-2.0-flash` → `gemini-2.0-flash-001` (Vertex requires version suffix) |
| User switched to `gemini-2.5-flash-lite` | Noted; later upgraded to `gemini-2.5-pro` |
| Docker tag invalid (trailing hyphen in repo name) | Added `cloudbuild.yaml` with clean image path |
| Cloud Build not using `cloudbuild.yaml` | Edited trigger manually in Cloud Build console |
| ESLint blocking build | Next.js 16 removed ESLint from build step — removed the dead config |
| `next.config.ts` `eslint` key invalid in Next.js 16 | Removed it |
| MongoDB throws at build time | Made `clientPromise` lazy via `getMongoClient()` function |
| `COPY public` fails — no `public/` dir | Created `public/.gitkeep` |
| MongoDB Atlas SSL error on Cloud Run | Allowed `0.0.0.0/0` in Atlas Network Access |
| `GOOGLE_CLOUD_PROJECT` not set on Cloud Run | Added env var in Cloud Run → Edit & Deploy New Revision |

---

## Current State

- **9/9 tests passing** locally
- **Build succeeds** on Cloud Build (Next.js 16.2.4, all 5 pages generated)
- **Deployed on Google Cloud Run** — `australia-southeast1`
- **AI model**: Gemini 2.5 Pro via Vertex AI (ADC auth, no API key)
- **Database**: MongoDB Atlas M0 free tier
- **Last blocker**: MongoDB Atlas SSL error — fixed by allowing `0.0.0.0/0` in Network Access

---

## Environment Variables (Cloud Run)

| Variable | Value |
|---|---|
| `GOOGLE_CLOUD_PROJECT` | `fakebuster-494717` |
| `MONGODB_URI` | MongoDB Atlas connection string |

---

## What's Next (Planned)

- **Video analysis** (TikTok / Douyin) — Gemini 2.5 Pro handles video natively; plan is: download with `yt-dlp` → send as base64 → same verdict + report structure
- Rename GitHub repo from `FakeBuster-` to `FakeBuster` to clean up the trailing hyphen that caused Cloud Build pain
