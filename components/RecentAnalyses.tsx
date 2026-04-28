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
