import { HomeView } from "@/components/pages/HomeView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Главная",
  description: "teñ. — персональное обучение, диагностика и карьерный план для школьников Казахстана.",
};

export default function HomePage() {
  return <HomeView />;
}
