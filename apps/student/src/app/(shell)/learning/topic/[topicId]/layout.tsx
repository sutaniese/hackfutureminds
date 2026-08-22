import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Тема",
  description: "Конспект темы, адаптивные задания с разбором и AI-репетитор.",
};

export default function LearningTopicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
