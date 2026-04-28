// components/FlaggedQuote.tsx
interface Props {
  quote: string;
  warning: string;
}

export default function FlaggedQuote({ quote, warning }: Props) {
  return (
    <div className="border border-red-200 rounded-lg p-4 bg-white">
      <p className="italic text-gray-700 text-sm mb-2">&ldquo;{quote}&rdquo;</p>
      <p className="text-red-600 text-sm flex gap-1.5">
        <span>⚠️</span>
        <span>{warning}</span>
      </p>
    </div>
  );
}
