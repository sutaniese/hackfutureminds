export default function OnboardingPage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-bold text-foreground">Onboarding</h1>
      <p className="text-sm text-[var(--pw-muted)]">
        The step-by-step chat and progress bar will live here (next
        implementation step).
      </p>
      <div className="pw-card p-4 text-sm text-foreground">
        Placeholder: you will answer 7 short questions, one at a time.
      </div>
    </div>
  );
}
