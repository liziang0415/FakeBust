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
    if (cleaned.length < 20) throw new Error("Could not extract article text from this URL");
    return cleaned;
  } finally {
    clearTimeout(timeout);
  }
}
