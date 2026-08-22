import { PortfolioView } from "@/components/pages/PortfolioView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Портфолио",
  description: "Файлы и заметки (сеанс браузера) — teñ.",
};

export default function PortfolioPage() {
  return <PortfolioView />;
}
