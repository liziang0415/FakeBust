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
