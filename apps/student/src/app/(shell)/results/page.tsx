import { ResultsView } from "@/components/pages/ResultsView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "План",
  description: "Персональные направления и гранты (teñ.)",
};

export default function ResultsPage() {
  return <ResultsView />;
}
