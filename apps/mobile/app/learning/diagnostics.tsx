/**
 * Diagnostics screen — mobile.
 *
 * Job 3 changes:
 * - «Не знаю» button advances the flow and records an explicit «don't know»
 *   signal (stored as a miss with given="__dontknow") in the recommendation engine.
 * - Bottom nav is hidden: Screen is rendered with hideNav=true and the
 *   RoleTabs in _layout.tsx do not show on this route (pathname guard).
 * - Polished intro animation with built-in Animated API (Expo Go compatible).
 *
 * Job 4 changes (results screen):
 * - Clear 3/8 score header + level + "what happens next" explanation.
 * - Per-question review: green for correct, red for wrong + correct answer shown.
 * - Each miss shows the skill/topic it maps to with a link to that topic.
 * - Icons+labels (never color alone). Works with contrast toggle.
 */

import { canAccessUniversityLayer, goalsForGrade, sanitizeGoalsForGrade } from "@pathwise/shared";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/AuthContext";
import { useI18n } from "../../src/context/I18nContext";
import type { Topic } from "../../src/lib/learning/types";
import { SUBJECTS } from "../../src/lib/learning/catalog";
import {
  DIAGNOSTIC_SIZE,
  diagnosticPool,
  evaluateDiagnostic,
  nextDifficulty,
  pickNextDiagnostic,
} from "../../src/lib/learning/recommend";
import {
  readAllTopics,
  saveDiagnostic,
  seedDueReview,
  upsertRosterEntry,
  writeLearningProfile,
} from "../../src/lib/learning/store";
import {
  isAnswerCorrect,
  LEARNING_GOALS,
  taskCorrectLabel,
  type Grade,
  type LearningGoalId,
  type Task,
} from "../../src/lib/learning/types";
import { colors, tap } from "../../src/lib/theme";

/* ───────────── constants ───────────── */

const GRADES: Grade[] = [7, 8, 9, 10, 11, 12];
const MINUTES = [15, 30, 45, 60];
const DONT_KNOW = "__dontknow";

type Stage = "grade" | "subject" | "goal" | "intro" | "test" | "result";
type RecordType = { task: Task; correct: boolean; given: string };

function defaultExamDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 21);
  return d.toISOString().slice(0, 10);
}

/** Subject emoji/color used in the intro splash. */
const SUBJECT_STYLE: Record<string, { mark: string; accent: string }> = {
  math: { mark: "∑", accent: "#6C63FF" },
  physics: { mark: "⚡", accent: "#3B82F6" },
  informatics: { mark: "💻", accent: "#10B981" },
  chemistry: { mark: "⚗️", accent: "#F59E0B" },
  biology: { mark: "🧬", accent: "#22C55E" },
  history: { mark: "🏛️", accent: "#EF4444" },
  english: { mark: "🇬🇧", accent: "#8B5CF6" },
};

function subjectVisuals(id: string): { mark: string; accent: string } {
  return SUBJECT_STYLE[id] ?? { mark: "📚", accent: "#6C63FF" };
}

/* ───────────── small components ───────────── */

function ChipBtn({
  label,
  selected,
  onPress,
  accent,
  palette,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accent?: string;
  palette: ReturnType<typeof useI18n>["palette"];
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{
        minHeight: tap,
        paddingHorizontal: 18,
        borderRadius: 999,
        backgroundColor: selected ? (accent ?? palette.primary) : palette.surface,
        borderWidth: 1.5,
        borderColor: selected ? (accent ?? palette.primary) : palette.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: selected ? "#fff" : palette.ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Btn({
  label,
  onPress,
  variant = "primary",
  palette,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  palette: ReturnType<typeof useI18n>["palette"];
}) {
  const bg =
    variant === "primary" ? palette.primary : variant === "secondary" ? palette.accentSoft : "transparent";
  const textCol = variant === "primary" ? palette.primaryFg : palette.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: tap,
        borderRadius: 999,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
        flex: 1,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "800", color: textCol }}>{label}</Text>
    </Pressable>
  );
}

function Card({
  children,
  palette,
}: {
  children: React.ReactNode;
  palette: ReturnType<typeof useI18n>["palette"];
}) {
  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderRadius: 20,
        padding: 18,
        gap: 12,
        shadowColor: "#0F172A",
        shadowOpacity: 0.07,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}
    >
      {children}
    </View>
  );
}

function Label({ text, palette }: { text: string; palette: ReturnType<typeof useI18n>["palette"] }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", color: palette.primary }}>
      {text}
    </Text>
  );
}

/* ───────────── intro animation ───────────── */

function DiagIntro({
  subjectId,
  onDone,
  t,
  palette,
}: {
  subjectId: string;
  onDone: () => void;
  t: (key: string) => string;
  palette: ReturnType<typeof useI18n>["palette"];
}) {
  const vis = subjectVisuals(subjectId);
  const subject = SUBJECTS.find((item) => item.id === subjectId);

  /* fade + slide up animation */
  const anim = useRef(new Animated.Value(0)).current;
  const slide = anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [anim]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("diag.intro.tap")}
      onPress={onDone}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: vis.accent, gap: 24, padding: 32 }}
    >
      <Animated.View style={{ alignItems: "center", gap: 18, opacity: anim, transform: [{ translateY: slide }] }}>
        <Text style={{ fontSize: 72 }}>{vis.mark}</Text>
        <Text style={{ fontSize: 30, fontWeight: "800", color: "#fff", textAlign: "center" }}>
          {subject?.title ?? subjectId}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: "600", color: "rgba(255,255,255,0.85)", textAlign: "center" }}>
          {t("diag.intro.greeting")}
        </Text>
        <View
          style={{
            marginTop: 12,
            paddingHorizontal: 22,
            paddingVertical: 12,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.22)",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>{t("diag.intro.tap")}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* ───────────── results screen ───────────── */

function ResultsView({
  result,
  records,
  grade,
  subjectId,
  topics,
  t,
  palette,
  router,
}: {
  result: ReturnType<typeof evaluateDiagnostic>;
  records: RecordType[];
  grade: Grade;
  subjectId: string;
  topics: Topic[];
  t: (key: string, params?: Record<string, string | number>) => string;
  palette: ReturnType<typeof useI18n>["palette"];
  router: ReturnType<typeof useRouter>;
}) {
  const subject = SUBJECTS.find((item) => item.id === subjectId);
  const accuracy = Math.round((result.correct / Math.max(1, result.total)) * 100);

  const levelColor =
    result.level >= 3 ? colors.secondary : result.level >= 2 ? colors.primary : colors.danger;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 14 }}
    >
      {/* Header score block */}
      <Card palette={palette}>
        <Label text={t("diag.step3")} palette={palette} />
        <Text style={{ fontSize: 32, fontWeight: "800", color: levelColor }}>
          {result.correct}/{result.total}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: levelColor + "22",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "800", color: levelColor }}>
              {t(`level.${result.level}`)}
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: palette.muted, fontWeight: "600" }}>
            {accuracy}% · {subject?.title ?? subjectId} · {grade} кл.
          </Text>
        </View>
        {/* What happens next */}
        <View style={{ borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 10, marginTop: 2 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: palette.primary, marginBottom: 4 }}>
            {t("diag.result.whatNext")}
          </Text>
          <Text style={{ fontSize: 13, color: palette.muted, lineHeight: 20 }}>
            {t("diag.resultHint", { subject: subject?.title ?? subjectId, grade })}
          </Text>
        </View>
      </Card>

      {/* Per-question review */}
      <Card palette={palette}>
        <Label text={t("diag.byQuestion")} palette={palette} />
        {records.map((item, index) => {
          const correct = item.correct;
          const dontKnow = item.given === DONT_KNOW;
          const topicId = item.task.topicId;
          const topic = topics.find((tp) => tp.id === topicId);
          const rowBg = correct ? "#F0FFF8" : "#FFF0F0";
          const rowBorder = correct ? colors.secondary : colors.danger;
          const icon = correct ? "✓" : dontKnow ? "?" : "✗";
          const iconColor = correct ? colors.secondary : dontKnow ? colors.warning : colors.danger;
          const iconLabel = correct ? t("learn.correct") : dontKnow ? t("diag.dontKnow") : t("learn.wrong");

          return (
            <View
              key={item.task.id}
              style={{
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: rowBorder,
                backgroundColor: rowBg,
                padding: 12,
                gap: 6,
              }}
            >
              {/* Question + icon */}
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: iconColor,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 1,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#fff" }}>{icon}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: palette.ink, lineHeight: 18 }}>
                    {index + 1}. {item.task.prompt}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: iconColor }}>{iconLabel}</Text>
                </View>
              </View>

              {/* Correct answer for wrong/don't know */}
              {!correct ? (
                <View style={{ backgroundColor: colors.secondary + "22", borderRadius: 8, padding: 8, gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: colors.secondary }}>
                    ✓ {taskCorrectLabel(item.task)}
                  </Text>
                  {item.task.explanation ? (
                    <Text style={{ fontSize: 12, color: palette.muted, lineHeight: 18 }}>
                      {item.task.explanation}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {/* Skill / topic link */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                <Text style={{ fontSize: 11, color: palette.muted, fontWeight: "600" }}>
                  {t("diag.result.skillLabel", { skill: item.task.skill })}
                </Text>
                {!correct && topic ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => router.push(`/learning/topic/${topicId}` as never)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: palette.primary + "22",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "800", color: palette.primary }}>
                      {t("diag.result.openTopic")} →
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </Card>

      {/* Actions */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Btn label={t("diag.openDash")} onPress={() => router.replace("/learning")} palette={palette} />
        <Btn
          label={t("diag.toRoadmap")}
          onPress={() => router.replace("/roadmap")}
          variant="secondary"
          palette={palette}
        />
      </View>
    </ScrollView>
  );
}

/* ───────────── main screen ───────────── */

export default function DiagnosticsScreen() {
  const { t, palette } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const topics = readAllTopics();

  const [stage, setStage] = useState<Stage>("grade");
  const [grade, setGrade] = useState<Grade>(9);
  const [subjectId, setSubjectId] = useState("math");
  const [goals, setGoals] = useState<LearningGoalId[]>(["school"]);
  const [examDate, setExamDate] = useState(defaultExamDate());
  const [minutesPerDay, setMinutesPerDay] = useState(30);
  const [asked, setAsked] = useState<Task[]>([]);
  const [records, setRecords] = useState<RecordType[]>([]);
  const [current, setCurrent] = useState<Task | null>(null);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [answer, setAnswer] = useState("");

  const pool = useMemo(() => diagnosticPool(topics, subjectId, grade), [topics, subjectId, grade]);
  const visibleGoals = useMemo(() => goalsForGrade(LEARNING_GOALS, grade), [grade]);

  function pickGrade(next: Grade) {
    setGrade(next);
    setGoals((prev) => {
      if (!canAccessUniversityLayer(next)) return sanitizeGoalsForGrade(prev, next);
      if (prev.length === 1 && prev[0] === "school") return ["ent"];
      return prev;
    });
  }

  function startTest() {
    const first = pickNextDiagnostic(pool, [], 2);
    if (!first) return;
    writeLearningProfile({
      grade,
      subjectId,
      goals: sanitizeGoalsForGrade(goals, grade),
      examDate,
      minutesPerDay,
    });
    setAsked([first]);
    setCurrent(first);
    setRecords([]);
    setDifficulty(2);
    setAnswer("");
    setStage("intro");
  }

  function submitOrDontKnow(givenAnswer: string) {
    if (!current) return;
    const isDontKnow = givenAnswer === DONT_KNOW;
    const normalizedGiven = isDontKnow ? "" : givenAnswer;
    const correct = isDontKnow
      ? false
      : isAnswerCorrect(current, current.type === "single" ? Number(normalizedGiven) : normalizedGiven);

    const nextRecords: RecordType[] = [
      ...records,
      { task: current, correct, given: isDontKnow ? DONT_KNOW : String(givenAnswer) },
    ];
    setRecords(nextRecords);
    const nextDiff = nextDifficulty(difficulty, correct);
    setDifficulty(nextDiff);
    if (nextRecords.length >= DIAGNOSTIC_SIZE) {
      finish(nextRecords);
      return;
    }
    const next = pickNextDiagnostic(pool, [...asked, current].map((item) => item.id), nextDiff);
    if (!next) {
      finish(nextRecords);
      return;
    }
    setAsked((prev) => [...prev, next]);
    setCurrent(next);
    setAnswer("");
  }

  function finish(finalRecords: RecordType[]) {
    const result = evaluateDiagnostic(subjectId, grade, finalRecords);
    saveDiagnostic(result);
    const weak = Object.entries(result.byTopic).sort(
      (a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total,
    )[0];
    if (weak) seedDueReview(weak[0]);
    if (user) {
      upsertRosterEntry({
        email: user.email,
        name: user.name,
        grade,
        subjectId,
        goals,
        level: result.level,
        mastery: 0,
        accuracy: Math.round((result.correct / result.total) * 100),
        solvedTasks: 0,
        weakTopics: Object.keys(result.byTopic).slice(0, 3),
        updatedAt: Date.now(),
      });
    }
    setStage("result");
  }

  const result = stage === "result" ? evaluateDiagnostic(subjectId, grade, records) : null;

  /* ── intro fullscreen ── */
  if (stage === "intro") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: subjectVisuals(subjectId).accent }}>
        <DiagIntro
          subjectId={subjectId}
          onDone={() => setStage("test")}
          t={t}
          palette={palette}
        />
      </SafeAreaView>
    );
  }

  /* ── results ── */
  if (stage === "result" && result) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
        <ResultsView
          result={result}
          records={records}
          grade={grade}
          subjectId={subjectId}
          topics={topics}
          t={t}
          palette={palette}
          router={router}
        />
      </SafeAreaView>
    );
  }

  /* ── profile + test: full-screen no nav ── */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
      {/* Close/back affordance */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("diag.back")}
          onPress={() => {
            if (stage === "grade") { router.back(); return; }
            if (stage === "subject") { setStage("grade"); return; }
            if (stage === "goal") { setStage("subject"); return; }
            if (stage === "test") { setStage("goal"); return; }
          }}
          style={{ minHeight: tap, minWidth: tap, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 20, color: palette.ink }}>←</Text>
        </Pressable>
        <Text style={{ flex: 1, fontSize: 12, fontWeight: "800", letterSpacing: 1.1, textTransform: "uppercase", color: palette.primary, textAlign: "center" }}>
          {stage === "grade"
            ? t("diag.step1")
            : stage === "subject"
              ? t("diag.step1")
              : stage === "goal"
                ? t("diag.step1")
                : t("diag.step2")}
        </Text>
        <View style={{ width: tap }} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 14 }}
        style={{ flex: 1 }}
      >

        {/* Grade */}
        {stage === "grade" ? (
          <Card palette={palette}>
            <Label text={t("diag.step1")} palette={palette} />
            <Text style={{ fontSize: 20, fontWeight: "800", color: palette.ink }}>{t("diag.askGrade")}</Text>
            <Text style={{ fontSize: 13, color: palette.muted }}>{t("diag.hintGrade")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {GRADES.map((item) => (
                <ChipBtn
                  key={item}
                  label={String(item)}
                  selected={grade === item}
                  onPress={() => pickGrade(item)}
                  palette={palette}
                />
              ))}
            </View>
            <Btn label={t("diag.nextSubject")} onPress={() => setStage("subject")} palette={palette} />
          </Card>
        ) : null}

        {/* Subject */}
        {stage === "subject" ? (
          <Card palette={palette}>
            <Label text={t("diag.step1")} palette={palette} />
            <Text style={{ fontSize: 20, fontWeight: "800", color: palette.ink }}>{t("diag.askSubject")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SUBJECTS.map((item) => (
                <ChipBtn
                  key={item.id}
                  label={item.title}
                  selected={subjectId === item.id}
                  onPress={() => setSubjectId(item.id)}
                  accent={item.accent}
                  palette={palette}
                />
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Btn label={t("diag.back")} onPress={() => setStage("grade")} variant="secondary" palette={palette} />
              <Btn label={t("diag.nextGoal")} onPress={() => setStage("goal")} palette={palette} />
            </View>
          </Card>
        ) : null}

        {/* Goal */}
        {stage === "goal" ? (
          <Card palette={palette}>
            <Label text={t("diag.step1")} palette={palette} />
            <Text style={{ fontSize: 20, fontWeight: "800", color: palette.ink }}>{t("diag.askGoal")}</Text>
            <Text style={{ fontSize: 13, color: palette.muted }}>{t("diag.goalHint")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {visibleGoals.map((item) => (
                <ChipBtn
                  key={item.id}
                  label={t(`goal.${item.id}`)}
                  selected={goals.includes(item.id)}
                  onPress={() =>
                    setGoals((prev) =>
                      prev.includes(item.id)
                        ? prev.filter((g) => g !== item.id)
                        : [...prev, item.id],
                    )
                  }
                  palette={palette}
                />
              ))}
            </View>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: palette.ink }}>{t("diag.minutes")}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {MINUTES.map((item) => (
                  <ChipBtn
                    key={item}
                    label={`${item} мин`}
                    selected={minutesPerDay === item}
                    onPress={() => setMinutesPerDay(item)}
                    palette={palette}
                  />
                ))}
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Btn label={t("diag.back")} onPress={() => setStage("subject")} variant="secondary" palette={palette} />
              <Btn label={t("diag.start")} onPress={startTest} palette={palette} />
            </View>
          </Card>
        ) : null}

        {/* Test question */}
        {stage === "test" && current ? (
          <Card palette={palette}>
            <Label
              text={t("diag.qOf", { a: records.length + 1, b: DIAGNOSTIC_SIZE })}
              palette={palette}
            />
            {/* Progress bar */}
            <View style={{ height: 4, borderRadius: 2, backgroundColor: palette.border }}>
              <View
                style={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: palette.primary,
                  width: `${((records.length) / DIAGNOSTIC_SIZE) * 100}%`,
                }}
              />
            </View>
            <Text style={{ fontSize: 11, color: palette.muted }}>
              {t("diag.adapt")}
            </Text>
            {current.passage ? (
              <View style={{ backgroundColor: palette.border + "44", borderRadius: 10, padding: 12 }}>
                <Text style={{ fontSize: 13, color: palette.ink, lineHeight: 20 }}>{current.passage}</Text>
              </View>
            ) : null}
            <Text style={{ fontSize: 17, fontWeight: "800", color: palette.ink, lineHeight: 25 }}>
              {current.prompt}
            </Text>
            <Text style={{ fontSize: 11, color: palette.muted, marginTop: -6 }}>
              {t("diag.topicSkill", { skill: current.skill })}
            </Text>

            {/* Options or text field */}
            {current.type === "single" && current.options ? (
              <View style={{ gap: 8 }}>
                {current.options.map((option, index) => (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: answer === String(index) }}
                    onPress={() => setAnswer(String(index))}
                    style={{
                      minHeight: tap,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: answer === String(index) ? palette.primary : palette.border,
                      backgroundColor: answer === String(index) ? palette.primary + "15" : palette.surface,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: answer === String(index) ? palette.primary : palette.border,
                        backgroundColor: answer === String(index) ? palette.primary : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {answer === String(index) ? (
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} />
                      ) : null}
                    </View>
                    <Text
                      style={{ fontSize: 13, color: answer === String(index) ? palette.primary : palette.ink, fontWeight: "600", flex: 1 }}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <TextInput
                value={answer}
                onChangeText={setAnswer}
                placeholder={t("answer.short")}
                placeholderTextColor={palette.muted}
                multiline
                textAlignVertical="top"
                style={{
                  borderWidth: 1.5,
                  borderColor: palette.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  backgroundColor: palette.surface,
                  fontSize: 14,
                  color: palette.ink,
                  minHeight: 80,
                }}
              />
            )}

            <View style={{ flexDirection: "row", gap: 10 }}>
              {/* «Не знаю» button */}
              <Pressable
                accessibilityRole="button"
                onPress={() => submitOrDontKnow(DONT_KNOW)}
                style={{
                  minHeight: tap,
                  paddingHorizontal: 18,
                  borderRadius: 999,
                  borderWidth: 1.5,
                  borderColor: palette.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: palette.muted }}>{t("diag.dontKnow")}</Text>
              </Pressable>

              {/* Answer / Finish button */}
              <Pressable
                accessibilityRole="button"
                disabled={answer.trim() === ""}
                onPress={() => {
                  if (answer.trim() === "") return;
                  submitOrDontKnow(answer);
                }}
                style={{
                  flex: 1,
                  minHeight: tap,
                  borderRadius: 999,
                  backgroundColor: answer.trim() === "" ? palette.border : palette.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "800",
                    color: answer.trim() === "" ? palette.muted : palette.primaryFg,
                  }}
                >
                  {records.length + 1 >= DIAGNOSTIC_SIZE ? t("diag.done") : t("diag.answer")}
                </Text>
              </Pressable>
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
