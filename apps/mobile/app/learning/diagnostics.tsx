import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { Body, Card, Chip, ErrorText, Field, Kicker, PrimaryButton, SecondaryButton, Stat, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { useI18n } from "../../src/context/I18nContext";
import { SUBJECTS } from "../../src/lib/learning/catalog";
import {
  DIAGNOSTIC_SIZE,
  diagnosticPool,
  evaluateDiagnostic,
  nextDifficulty,
  pickNextDiagnostic,
} from "../../src/lib/learning/recommend";
import { readAllTopics, saveDiagnostic, seedDueReview, upsertRosterEntry, writeLearningProfile } from "../../src/lib/learning/store";
import { isAnswerCorrect, LEARNING_GOALS, taskCorrectLabel, type Grade, type LearningGoalId, type Task } from "../../src/lib/learning/types";

const GRADES: Grade[] = [7, 8, 9, 10, 11, 12];
const MINUTES = [15, 30, 45, 60];

function defaultExamDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 21);
  return d.toISOString().slice(0, 10);
}

export default function DiagnosticsScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const topics = readAllTopics();

  const [stage, setStage] = useState<"grade" | "subject" | "goal" | "test" | "result">("grade");
  const [grade, setGrade] = useState<Grade>(9);
  const [subjectId, setSubjectId] = useState("math");
  const [goals, setGoals] = useState<LearningGoalId[]>(["ent"]);
  const [examDate, setExamDate] = useState(defaultExamDate());
  const [minutesPerDay, setMinutesPerDay] = useState(30);
  const [asked, setAsked] = useState<Task[]>([]);
  const [records, setRecords] = useState<{ task: Task; correct: boolean; given: string }[]>([]);
  const [current, setCurrent] = useState<Task | null>(null);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);

  const pool = useMemo(() => diagnosticPool(topics, subjectId, grade), [topics, subjectId, grade]);
  const subject = SUBJECTS.find((item) => item.id === subjectId);

  function startTest() {
    const first = pickNextDiagnostic(pool, [], 2);
    if (!first) {
      setError(t("diag.noNext"));
      return;
    }
    writeLearningProfile({ grade, subjectId, goals, examDate, minutesPerDay });
    setAsked([first]);
    setCurrent(first);
    setRecords([]);
    setDifficulty(2);
    setAnswer("");
    setStage("test");
  }

  function submitAnswer() {
    if (!current) return;
    const given = current.type === "single" ? answer : answer.trim();
    const correct = isAnswerCorrect(current, current.type === "single" ? Number(given) : given);
    const nextRecords = [...records, { task: current, correct, given: String(given) }];
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

  function finish(finalRecords: { task: Task; correct: boolean; given: string }[]) {
    const result = evaluateDiagnostic(subjectId, grade, finalRecords);
    saveDiagnostic(result);
    const weak = Object.entries(result.byTopic).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)[0];
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

  return (
    <Screen>
      <Card>
        <Kicker>{t("diag.kicker")}</Kicker>
        <Title>{t("diag.title")}</Title>
        <Body>{t("diag.desc")}</Body>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Stat value="8" label={t("diag.stat.q")} />
          <Stat value="7-12" label={t("diag.stat.g")} />
          <Stat value="AI" label={t("diag.stat.ai")} />
        </View>
      </Card>

      {stage === "grade" ? (
        <Card>
          <Title>{t("diag.askGrade")}</Title>
          <Body>{t("diag.hintGrade")}</Body>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {GRADES.map((item) => (
              <Chip key={item} label={String(item)} selected={grade === item} onPress={() => setGrade(item)} />
            ))}
          </View>
          <PrimaryButton label={t("diag.nextSubject")} onPress={() => setStage("subject")} />
        </Card>
      ) : null}

      {stage === "subject" ? (
        <Card>
          <Title>{t("diag.askSubject")}</Title>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SUBJECTS.map((item) => (
              <Chip key={item.id} label={item.title} selected={subjectId === item.id} onPress={() => setSubjectId(item.id)} color={item.accent} />
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <SecondaryButton label={t("diag.back")} onPress={() => setStage("grade")} />
            <View style={{ flex: 1 }}>
              <PrimaryButton label={t("diag.nextGoal")} onPress={() => setStage("goal")} />
            </View>
          </View>
        </Card>
      ) : null}

      {stage === "goal" ? (
        <Card>
          <Title>{t("diag.askGoal")}</Title>
          <Body>{t("diag.goalHint")}</Body>
          {LEARNING_GOALS.map((item) => (
            <Chip
              key={item.id}
              label={`${t(`goal.${item.id}`)}`}
              selected={goals.includes(item.id)}
              onPress={() =>
                setGoals((prev) => (prev.includes(item.id) ? prev.filter((g) => g !== item.id) : [...prev, item.id]))
              }
            />
          ))}
          <Field label={t("diag.exam")} value={examDate} onChangeText={setExamDate} placeholder="YYYY-MM-DD" />
          <Body>{t("diag.minutes")}</Body>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {MINUTES.map((item) => (
              <Chip key={item} label={`${item}`} selected={minutesPerDay === item} onPress={() => setMinutesPerDay(item)} />
            ))}
          </View>
          <ErrorText message={error} />
          <PrimaryButton label={t("diag.start")} onPress={startTest} />
          <SecondaryButton label={t("diag.back")} onPress={() => setStage("subject")} />
        </Card>
      ) : null}

      {stage === "test" && current ? (
        <Card>
          <Kicker>{t("diag.qOf", { a: records.length + 1, b: DIAGNOSTIC_SIZE })}</Kicker>
          <Title>{current.prompt}</Title>
          <Body>{t("diag.topicSkill", { skill: current.skill })}</Body>
          {current.passage ? <Body>{current.passage}</Body> : null}
          {current.type === "single" && current.options ? (
            current.options.map((option, index) => (
              <Chip key={option} label={option} selected={answer === String(index)} onPress={() => setAnswer(String(index))} />
            ))
          ) : (
            <Field label={t("answer.short")} value={answer} onChangeText={setAnswer} />
          )}
          <PrimaryButton label={records.length + 1 >= DIAGNOSTIC_SIZE ? t("diag.done") : t("diag.answer")} onPress={submitAnswer} />
        </Card>
      ) : null}

      {stage === "result" && result ? (
        <Card>
          <Kicker>{t("diag.step3")}</Kicker>
          <Title>{t("diag.yourLevel", { level: t(`level.${result.level}`) })}</Title>
          <Body>{t("diag.resultHint", { subject: subject?.title ?? subjectId, grade })}</Body>
          <Stat value={`${result.correct}/${result.total}`} label={t("diag.correctOf")} />
          {records.map((item) => (
            <Body key={item.task.id}>
              {item.correct ? "✓" : "✗"} {item.task.prompt}
              {!item.correct ? ` — ${t("diag.rightAnswer", { answer: taskCorrectLabel(item.task) })}` : ""}
            </Body>
          ))}
          <PrimaryButton label={t("diag.openDash")} onPress={() => router.replace("/learning")} />
          <SecondaryButton label={t("diag.toRoadmap")} onPress={() => router.replace("/roadmap")} />
        </Card>
      ) : null}
    </Screen>
  );
}
