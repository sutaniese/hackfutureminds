import type { Metadata } from "next";
import { DiagnosticsView } from "@/components/pages/DiagnosticsView";

export const metadata: Metadata = {
  title: "Диагностика",
  description: "Короткая адаптивная диагностика знаний по выбранному предмету и классу.",
};

export default function DiagnosticsPage() {
  return <DiagnosticsView />;
}
