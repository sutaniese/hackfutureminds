import type { Metadata } from "next";
import { StudentClassView } from "@/components/learning/StudentClassView";

export const metadata: Metadata = {
  title: "Мой класс",
  description: "Код класса, домашка учителя и дедлайны ученика.",
};

export default function StudentClassPage() {
  return <StudentClassView />;
}
