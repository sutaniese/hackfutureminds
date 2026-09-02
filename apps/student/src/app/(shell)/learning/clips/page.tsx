import type { Metadata } from "next";
import { ClipsView } from "@/components/learning/ClipsView";

export const metadata: Metadata = {
  title: "Клипы",
  description: "Короткие вертикальные клипы по конспекту темы: крюк, идея, пример и проверка.",
};

export default function ClipsPage() {
  return <ClipsView />;
}
