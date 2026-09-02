import type { Metadata } from "next";
import { ClipPlayer } from "@/components/learning/ClipPlayer";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = {
  title: "Клипы",
  description: "Короткие вертикальные клипы по конспекту темы: крюк, идея, пример и проверка.",
};

export default function ClipsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHero
        compact
        kicker="Клипы"
        title="40–60 секунд, как сторис"
        description="Готовые клипы по квадратным уравнениям, Ньютону и Python. Четвёртый собирается из конспекта через Groq и озвучку. Без Veo и Runway."
      />
      <ClipPlayer />
    </div>
  );
}
