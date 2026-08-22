import { OnboardingView } from "@/components/pages/OnboardingView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Онбординг",
  description: "Семь вопросов, один шаг (teñ.)",
};

export default function OnboardingPage() {
  return <OnboardingView />;
}
