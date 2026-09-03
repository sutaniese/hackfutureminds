export type SceneKind =
  | "title"
  | "hook"
  | "formula"
  | "steps"
  | "code"
  | "timeline"
  | "compare"
  | "chips"
  | "recap"
  | "end";

export type SceneChip = { label: string; value: string };
export type SceneStep = { n: string; text: string };
export type SceneEvent = { year: string; text: string };

export type ClipScene = {
  kind: SceneKind;
  kicker?: string;
  heading: string;
  caption: string;
  voice: string;
  formula?: string;
  note?: string;
  chips?: SceneChip[];
  steps?: SceneStep[];
  code?: string;
  events?: SceneEvent[];
  left?: { title: string; text: string };
  right?: { title: string; text: string };
  bullets?: string[];
};

export type ClipScript = {
  id: string;
  topicId: string;
  locale: "ru" | "kk";
  title: string;
  subject: string;
  accent: string;
  quizTaskId: string;
  scenes: ClipScene[];
};

export type ClipTiming = {
  id: string;
  totalSeconds: number;
  sceneSeconds: number[];
  voiceFile: string;
};
