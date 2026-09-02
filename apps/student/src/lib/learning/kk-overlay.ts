import type { Locale } from "@/i18n/locales";
import type { Topic } from "./types";

/** Kazakh overlay for the quadratic path. Same ids — not a new catalog topic. */
const MATH_QUADRATIC_KK: Pick<Topic, "title" | "summary" | "skills" | "theory" | "tasks"> = {
  title: "Квадрат теңдеулер",
  summary: "Дискриминант, Виет теоремасы, көбейткіштерге жіктеу және мәтіндік есептер.",
  skills: ["Дискриминант", "Виет теоремасы", "Көбейткіштерге жіктеу", "Мәтіндік есептер"],
  theory: [
    "Квадрат теңдеу ax² + bx + c = 0 түрінде жазылады, a ≠ 0. Түбір санын дискриминант D = b² − 4ac анықтайды.",
    "Түбірлер x = (−b ± √D) / (2a). Коэффициенттер кішкентай болса, Виет ыңғайлы: x₁ + x₂ = −b/a, x₁ · x₂ = c/a.",
    "Көбейткіштерге жіктеу теңдеуді ауызша шешуге көмектеседі: x² − 9 = (x − 3)(x + 3).",
    "Мәтіндік есепте алдымен айнымалыны енгіз, сосын теңдеу жаз. Ұзындық теріс болмауы керек.",
  ],
  tasks: [
    {
      id: "math-quadratic-1",
      topicId: "math-quadratic",
      type: "single",
      difficulty: 1,
      skill: "Дискриминант",
      prompt: "x² − 6x + 9 = 0 теңдеуінің неше түбірі бар?",
      options: ["Екі түрлі түбір", "Бір түбір", "Түбір жоқ", "Шексіз көп түбір"],
      answer: 1,
      explanation: "D = 36 − 36 = 0. Дискриминант нөл болса, түбір жалғыз: x = 3.",
      minutes: 2,
    },
    {
      id: "math-quadratic-2",
      topicId: "math-quadratic",
      type: "numeric",
      difficulty: 1,
      skill: "Виет теоремасы",
      prompt: "x² − 7x + 12 = 0 теңдеуі түбірлерінің қосындысын табыңыз.",
      answer: "7",
      explanation: "Виет бойынша x₁ + x₂ = 7. Тексеру: 3 + 4 = 7.",
      minutes: 2,
    },
    {
      id: "math-quadratic-3",
      topicId: "math-quadratic",
      type: "single",
      difficulty: 2,
      skill: "Дискриминант",
      prompt: "x² − 5x + 6 = 0 теңдеуін шешіңіз.",
      options: ["x = 1 және x = 6", "x = 2 және x = 3", "x = −2 және x = −3", "Түбір жоқ"],
      answer: 1,
      explanation: "D = 1, x = (5 ± 1)/2, яғни 2 және 3.",
      minutes: 3,
    },
    {
      id: "math-quadratic-4",
      topicId: "math-quadratic",
      type: "single",
      difficulty: 2,
      skill: "Көбейткіштерге жіктеу",
      prompt: "x² − 9 өрнегін көбейткіштерге жіктеңіз.",
      options: ["(x − 3)(x + 3)", "(x − 9)(x + 1)", "(x − 3)²", "(x + 9)(x − 1)"],
      answer: 0,
      explanation: "Квадраттар айырымы: a² − b² = (a − b)(a + b).",
      minutes: 2,
    },
    {
      id: "math-quadratic-5",
      topicId: "math-quadratic",
      type: "numeric",
      difficulty: 3,
      skill: "Мәтіндік есептер",
      prompt: "Тіктөртбұрыш периметрі 26 см, ауданы 40 см². Үлкен қабырғасын табыңыз (см).",
      answer: "8",
      explanation: "a + b = 13, a·b = 40 → x² − 13x + 40 = 0, қабырғалар 8 және 5.",
      minutes: 5,
    },
  ],
};

export function localizeTopic(topic: Topic, locale: Locale | "ru" | "kk"): Topic {
  if (locale !== "kk" || topic.id !== "math-quadratic") return topic;
  return {
    ...topic,
    ...MATH_QUADRATIC_KK,
  };
}
