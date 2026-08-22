import { OnboardingChat } from "@/components/onboarding/OnboardingChat";

export default function OnboardingPage() {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-foreground">Onboarding</h1>
        <p className="mt-1 text-sm text-[var(--pw-muted)]">
          Answer 7 short questions, one at a time — results use your answers
          in the next steps.
        </p>
      </div>
      <OnboardingChat />
    </div>
  );
}
