export default function ResultsPage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-bold text-foreground">Results</h1>
      <p className="text-sm text-[var(--pw-muted)]">
        Career map, financial route, and resume block will show here after
        generation.
      </p>
      <div className="pw-card p-4 text-sm text-foreground">
        Placeholder for career paths, KZT ranges, and matched output.
      </div>
    </div>
  );
}
