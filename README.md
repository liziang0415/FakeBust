# FakeBuster — AI Fake News Detector

A free, multilingual AI-powered fake news detector built with Next.js 15, Google Gemini, and MongoDB Atlas.

## Features
- Analyzes news articles in **any language**
- Paste text directly or enter a URL
- Instant verdict: **REAL**, **FAKE**, or **UNCERTAIN**
- Confidence score with visual bar
- **Why** paragraph explaining the verdict
- **Flagged quotes** from the article with specific warnings
- Permanent shareable report URLs
- Recent analyses feed on the home page

## Tech Stack
- **Frontend + Backend**: Next.js 15 (App Router, TypeScript, Tailwind CSS)
- **AI**: Google Gemini 2.0 Flash (free tier)
- **Database**: MongoDB Atlas M0 (free tier)
- **Hosting**: Vercel (free hobby tier)

## Setup

### 1. Clone and install
```bash
git clone https://github.com/liziang0415/FakeBuster-.git
cd FakeBuster-
npm install
```

### 2. Environment variables
Copy `.env.local.example` to `.env.local` and fill in:
- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/) (free)
- `MONGODB_URI` — from [MongoDB Atlas](https://www.mongodb.com/atlas) (free M0 cluster)
- `NEXT_PUBLIC_BASE_URL` — your app URL (e.g. `http://localhost:3000` for local)

### 3. Run locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel
1. Push to GitHub
2. Import repo at [vercel.com/new](https://vercel.com/new)
3. Add environment variables: `GEMINI_API_KEY`, `MONGODB_URI`, `NEXT_PUBLIC_BASE_URL`
4. Deploy

## Testing
```bash
npm test
```
