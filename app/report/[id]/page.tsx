// app/report/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import VerdictBadge from "@/components/VerdictBadge";
import FlaggedQuote from "@/components/FlaggedQuote";
import CopyButton from "@/components/CopyButton";
import clientPromise from "@/lib/mongodb";
import type { Analysis } from "@/types/analysis";

interface Props {
  params: Promise<{ id: string }>;
}

async function getAnalysis(id: string): Promise<Analysis | null> {
  const client = await clientPromise;
  const doc = await client.db("fakebuster").collection("analyses").findOne({ _id: id as any });
  return doc as Analysis | null;
}

const toneStyle: Record<string, string> = {
  neutral:        "bg-gray-100 text-gray-600",
  credible:       "bg-green-100 text-green-700",
  sensationalist: "bg-orange-100 text-orange-700",
  alarmist:       "bg-red-100 text-red-700",
  misleading:     "bg-yellow-100 text-yellow-700",
  satirical:      "bg-purple-100 text-purple-700",
};

export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  const toneClass = toneStyle[analysis.tone] ?? "bg-gray-100 text-gray-600";

  return (
    <main className="min-h-screen py-16 px-4">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="text-indigo-600 text-sm hover:underline">← Back to FakeBuster</Link>
          <CopyButton />
        </div>

        {/* Verdict */}
        <VerdictBadge
          verdict={analysis.verdict as "REAL" | "FAKE" | "UNCERTAIN"}
          confidence={analysis.confidence}
          detectedLanguage={analysis.detectedLanguage}
        />

        {/* Tone badge */}
        {analysis.tone && (
          <div className="flex justify-center mb-6 -mt-4">
            <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${toneClass}`}>
              {analysis.tone} tone
            </span>
          </div>
        )}

        {/* Summary */}
        {analysis.summary && (
          <section className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">What it claims</h2>
            <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-100">
              {analysis.summary}
            </p>
          </section>
        )}

        {/* Analysis */}
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Analysis</h2>
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
