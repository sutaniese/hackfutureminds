import type { Metadata } from "next";
import { RoadmapView } from "@/components/pages/RoadmapView";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "Персональная интерактивная дорожная карта студента.",
};

export default function RoadmapPage() {
  return <RoadmapView />;
}
