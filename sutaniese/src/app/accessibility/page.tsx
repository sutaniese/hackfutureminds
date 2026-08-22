import { AccessibilityView } from "@/components/pages/AccessibilityView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Доступность",
  description: "teñ. — настройки доступа и клавиатура",
};

export default function AccessibilityPage() {
  return <AccessibilityView />;
}
