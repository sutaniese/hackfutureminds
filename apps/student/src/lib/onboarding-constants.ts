/** Subject chips — multi-select for step 1 */
export const ONBOARDING_SUBJECT_OPTIONS = [
  { id: "math", label: "Mathematics" },
  { id: "physics", label: "Physics" },
  { id: "chemistry", label: "Chemistry" },
  { id: "biology", label: "Biology" },
  { id: "history", label: "History" },
  { id: "english", label: "English" },
  { id: "kazakh", label: "Kazakh" },
  { id: "russian", label: "Russian" },
  { id: "cs", label: "Computer science" },
  { id: "literature", label: "Literature" },
  { id: "geography", label: "Geography" },
] as const;

/** Order keys 1..7; questions match `student_dev_EN.md` (Onboarding Questions) */
export const ONBOARDING_QUESTION_KEYS = [
  "q1",
  "q2",
  "q3",
  "q4",
  "q5",
  "q6",
  "q7",
] as const;
export type OnboardingQuestionKey = (typeof ONBOARDING_QUESTION_KEYS)[number];

export const ONBOARDING_COPY: Record<OnboardingQuestionKey, string> = {
  q1: "Which subjects do you enjoy most? (multi-select)",
  q2: "What do you do in your free time?",
  q3: "Your top achievements? (olympiads, projects, volunteering)",
  q4: "Do you prefer working with people, data, hands, or ideas?",
  q5: "Where do you want to study — Kazakhstan or abroad?",
  q6: "Which city are you considering?",
  q7: "Are there any family budget constraints?",
};

export const WORK_OPTIONS: { id: "people" | "data" | "hands" | "ideas"; label: string; hint: string }[] =
  [
    { id: "people", label: "People", hint: "Teams, users, care" },
    { id: "data", label: "Data", hint: "Analysis, research, numbers" },
    { id: "hands", label: "Hands", hint: "Build, repair, lab work" },
    { id: "ideas", label: "Ideas", hint: "Design, strategy, concepts" },
  ];
