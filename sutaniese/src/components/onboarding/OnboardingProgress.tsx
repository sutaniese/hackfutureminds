import { TOTAL_ONBOARDING_STEPS } from "@/types/onboarding";

type Props = {
  currentStep: number; // 0..TOTAL-1 while in flow
  total: typeof TOTAL_ONBOARDING_STEPS;
  id?: string;
};

export function OnboardingProgress({ currentStep, total, id }: Props) {
  const safe = Math.min(
    Math.max(0, currentStep),
    total - 1
  );
  const pct = ((safe + 1) / total) * 100;

  return (
    <div
      id={id}
      className="shrink-0 space-y-1.5"
      role="group"
      aria-label="Onboarding progress"
    >
      <p className="text-center text-xs font-semibold tracking-wide text-[var(--pw-muted)]">
        Step {safe + 1} of {total}
      </p>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-[var(--pw-border)]"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={safe + 1}
        aria-label={`Step ${safe + 1} of ${total}`}
        aria-valuetext={`${safe + 1} of ${total}`}
      >
        <div
          className="h-full rounded-full bg-[var(--pw-primary)] transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
