import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { videoClipFor } from "@pathwise/shared";
import { Screen } from "../../../src/components/Screen";
import { SpeakButton } from "../../../src/components/SpeakButton";
import { TopicClipPlayer } from "../../../src/components/TopicClipPlayer";
import { Body, Card, Chip, ErrorText, Field, Kicker, PrimaryButton, SecondaryButton, Title } from "../../../src/components/ui";
import { useI18n } from "../../../src/context/I18nContext";
import { useLearning } from "../../../src/context/LearningContext";
import { apiPost } from "../../../src/lib/api";
import { findTopic } from "../../../src/lib/learning/catalog";
import { localizeTopic } from "../../../src/lib/learning/kk-overlay";
import { nextTask, topicAccuracy, topicMastery } from "../../../src/lib/learning/recommend";
import { recordAttempt } from "../../../src/lib/learning/store";
import { isAnswerCorrect, taskCorrectLabel } from "../../../src/lib/learning/types";

type Tab = "practice" | "theory" | "tutor";

export default function TopicScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const { t, locale } = useI18n();
  const { topics, state } = useLearning();
  const router = useRouter();
  const raw = findTopic(topics, String(topicId));
  const topic = raw ? (locale === "kk" ? localizeTopic(raw, "kk") : raw) : null;
  const [tab, setTab] = useState<Tab>("practice");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [showClip, setShowClip] = useState(false);
  const clipLocale = locale === "kk" ? "kk" : "ru";
  const hasClip = Boolean(videoClipFor(String(topicId), clipLocale) || raw?.clipScript?.scenes?.length);

  if (!topic) {
    return (
      <Screen>
        <Card>
          <Title>{t("topic.notFound")}</Title>
          <Body>{t("topic.notFoundHint")}</Body>
          <PrimaryButton label={t("topic.backDash")} onPress={() => router.replace("/learning")} />
        </Card>
      </Screen>
    );
  }

  const task = nextTask(topic, state);
  const mastery = topicMastery(topic, state);
  const accuracy = topicAccuracy(topic, state);

  async function check() {
    if (!task) return;
    const given = task.type === "single" ? Number(answer) : answer;
    const correct = isAnswerCorrect(task, given);
    recordAttempt({
      taskId: task.id,
      topicId: topic.id,
      skill: task.skill,
      difficulty: task.difficulty,
      correct,
      answer: String(answer),
    });
    setBusy(true);
    try {
      const data = await apiPost<{ feedback: string; nextStep?: string }>("/api/learning/feedback", {
        prompt: task.prompt,
        studentAnswer: String(answer),
        correctAnswer: taskCorrectLabel(task),
        isCorrect: correct,
        explanation: task.explanation,
        topicTitle: topic.title,
        skill: task.skill,
        grade: topic.grades[0],
        difficulty: task.difficulty,
      });
      setFeedback(`${correct ? t("topic.yes") : t("topic.no")}. ${data.feedback}${data.nextStep ? `\n${t("topic.nextStep")}${data.nextStep}` : ""}`);
    } catch {
      setFeedback(
        correct
          ? `${t("topic.yes")}. ${task.explanation}`
          : `${t("topic.no")}. ${t("topic.rightIs", { answer: taskCorrectLabel(task) })} ${task.explanation}`,
      );
    } finally {
      setBusy(false);
      setAnswer("");
    }
  }

  async function askTutor(prompt: string) {
    const q = prompt.trim();
    if (!q) return;
    setChat((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");
    try {
      const data = await apiPost<{ answer: string }>("/api/learning/tutor", {
        question: q,
        topicTitle: topic.title,
        subjectTitle: topic.subjectId,
        grade: topic.grades[0],
        theory: topic.theory,
        history: chat.slice(-6),
      });
      setChat((prev) => [...prev, { role: "assistant", text: data.answer }]);
    } catch {
      setChat((prev) => [...prev, { role: "assistant", text: t("tutor.offline") }]);
    }
  }

  return (
    <Screen>
      <Card>
        <Kicker>{topic.custom ? t("topic.teacherAdded") : t("learn.kicker")}</Kicker>
        <Title>{topic.title}</Title>
        <Body>{topic.summary}</Body>
        <Body>{t("learn.masteredPct", { n: mastery })} · {t("learn.accuracy")} {accuracy ?? "—"}%</Body>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {(["practice", "theory", "tutor"] as Tab[]).map((item) => (
            <Chip key={item} label={t(`topic.tab.${item}`)} selected={tab === item} onPress={() => setTab(item)} />
          ))}
          {hasClip ? <Chip label={t("clips.badge")} selected={false} onPress={() => setShowClip((open) => !open)} /> : null}
        </View>
        {hasClip ? (
          <PrimaryButton
            label={showClip ? t("topic.hideClip") : t("topic.watchClip")}
            onPress={() => setShowClip((open) => !open)}
          />
        ) : null}
      </Card>

      {showClip && hasClip ? (
        <TopicClipPlayer
          topicId={topic.id}
          onWrongAnswer={() => {
            setShowClip(false);
            setTab("practice");
          }}
        />
      ) : null}

      {tab === "practice" ? (
        <Card>
          {task ? (
            <>
              <Title>{task.prompt}</Title>
              <Body>{t("topic.skillMin", { skill: task.skill, n: task.minutes })}</Body>
              <SpeakButton text={task.prompt} label={t("topic.listenTask")} />
              {task.type === "single" && task.options
                ? task.options.map((option, index) => (
                    <Chip key={option} label={option} selected={answer === String(index)} onPress={() => setAnswer(String(index))} />
                  ))
                : <Field label={t("answer.short")} value={answer} onChangeText={setAnswer} multiline />}
              <ErrorText message={feedback} />
              <PrimaryButton
                label={busy ? t("topic.checking") : t("topic.check")}
                onPress={check}
                busy={busy}
                disabled={answer.trim() === ""}
              />
            </>
          ) : (
            <>
              <Title>{t("topic.done")}</Title>
              <Body>{t("topic.doneHint")}</Body>
              <PrimaryButton label={t("topic.toRecs")} onPress={() => router.push("/learning")} />
            </>
          )}
        </Card>
      ) : null}

      {tab === "theory" ? (
        <Card>
          <Title>{t("topic.notes")}</Title>
          <SpeakButton text={topic.theory.join(" ")} label={t("topic.listenNotes")} />
          {topic.theory.map((p) => <Body key={p}>{p}</Body>)}
          {raw?.notes ? (
            <>
              <Kicker>{t("topic.notes")}</Kicker>
              <Body>{raw.notes.keyIdea}</Body>
              {raw.notes.formula ? <Body>{raw.notes.formula}</Body> : null}
              {raw.notes.bullets?.map((line) => <Body key={line}>{line}</Body>)}
              <Body>{raw.notes.example}</Body>
              <Body>{raw.notes.mistake}</Body>
            </>
          ) : null}
        </Card>
      ) : null}

      {tab === "tutor" ? (
        <Card>
          <Title>{t("tutor.title")}</Title>
          <Body>{t("tutor.hint", { title: topic.title })}</Body>
          {chat.length === 0 ? <Body>{t("tutor.empty")}</Body> : null}
          {chat.map((item, i) => (
            <Body key={`${item.role}-${i}`}>{item.role === "user" ? "→ " : "← "}{item.text}</Body>
          ))}
          <Chip label={t("tutor.q1")} onPress={() => void askTutor(t("tutor.q1"))} />
          <Chip label={t("tutor.q2")} onPress={() => void askTutor(t("tutor.q2"))} />
          <Chip label={t("tutor.q3")} onPress={() => void askTutor(t("tutor.q3"))} />
          <Field label={t("tutor.label")} value={question} onChangeText={setQuestion} placeholder={t("tutor.ph")} />
          <PrimaryButton label={t("tutor.ask")} onPress={() => void askTutor(question)} />
        </Card>
      ) : null}

      <SecondaryButton label={t("topic.toDash")} onPress={() => router.push("/learning")} />
    </Screen>
  );
}
