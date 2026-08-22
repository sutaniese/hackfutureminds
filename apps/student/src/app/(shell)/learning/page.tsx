import type { Metadata } from "next";
import { LearningView } from "@/components/pages/LearningView";

export const metadata: Metadata = {
  title: "Обучение",
  description: "Личный кабинет ученика: прогресс по темам, слабые места и персональный план.",
};

export default function LearningPage() {
  return <LearningView />;
}
