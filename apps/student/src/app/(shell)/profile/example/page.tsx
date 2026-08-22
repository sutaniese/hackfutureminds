import { ExampleProfileView } from "@/components/profile/ExampleProfileView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sultan Yessengeldi — пример",
  description: "Пример профиля: возраст 17, математика и физика.",
};

export default function ProfileExamplePage() {
  return <ExampleProfileView />;
}
