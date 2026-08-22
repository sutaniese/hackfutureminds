import { HomeView } from "@/components/pages/HomeView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Главная",
  description: "teñ. — старт, онбординг, карта направлений (RU/KK/EN).",
};

export default function HomePage() {
  return <HomeView />;
}
