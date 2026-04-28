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
    "<article><p>Breaking news: scientists discover water on Mars. The landmark study, published in Nature, confirms the presence of liquid water beneath the Martian south pole, opening new possibilities for life on the red planet.</p></article>"
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
