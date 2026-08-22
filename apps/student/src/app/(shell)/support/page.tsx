import type { Metadata } from "next";
import { SupportProfileView } from "@/components/pages/SupportProfileView";

export const metadata: Metadata = {
  title: "Персональная поддержка",
  description: "Индивидуальная страница поддержки студента — teñ.",
};

export default function SupportPage() {
  return <SupportProfileView />;
}
