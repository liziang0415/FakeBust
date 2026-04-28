// app/report/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import VerdictBadge from "@/components/VerdictBadge";
import FlaggedQuote from "@/components/FlaggedQuote";
import CopyButton from "@/components/CopyButton";
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
          <CopyButton url={shareUrl} />
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

        {/* Source URL */}
        {analysis.sourceUrl && (
          <p className="mt-8 text-xs text-gray-400">
            Source: <a href={analysis.sourceUrl} className="underline" target="_blank" rel="noopener noreferrer">{analysis.sourceUrl}</a>
          </p>
        )}
      </div>
    </main>
  );
}
