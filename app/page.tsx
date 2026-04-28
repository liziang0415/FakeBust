// app/page.tsx
import InputTabs from "@/components/InputTabs";
import RecentAnalyses from "@/components/RecentAnalyses";

export default function Home() {
  return (
    <main className="min-h-screen py-16 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-2">🔍 FakeBuster</h1>
          <p className="text-gray-500">Detect fake news in any language — powered by Gemini AI</p>
        </div>
        <InputTabs />
        <RecentAnalyses />
      </div>
    </main>
  );
}
