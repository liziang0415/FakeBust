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
