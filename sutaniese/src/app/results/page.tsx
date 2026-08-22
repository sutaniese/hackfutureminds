import { ResultsGenerateClient } from "@/components/results/ResultsGenerateClient";

export default function ResultsPage() {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-bold text-foreground">Results</h1>
        <p className="mt-1 text-sm text-[var(--pw-muted)]">
          After onboarding, run generation to load career, finance, and resume
          output from the API (Groq in{" "}
          <code className="text-xs">.env.local</code> is optional).
        </p>
      </div>
      <ResultsGenerateClient />
    </div>
  );
}
