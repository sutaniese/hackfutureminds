import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { SpeakButton } from "../../src/components/SpeakButton";
import { Body, Card, Chip, ErrorText, Field, Kicker, PrimaryButton, SecondaryButton, Title } from "../../src/components/ui";
import { useI18n } from "../../src/context/I18nContext";
import { useLearning } from "../../src/context/LearningContext";
import { apiPost } from "../../src/lib/api";
import { BAKED_CLIPS, localClipForTopic } from "../../src/lib/learning/clips";
import type { LearningClip } from "../../src/lib/learning/clips/types";
import { findTask } from "../../src/lib/learning/catalog";
import { weakSpots } from "../../src/lib/learning/recommend";
import { recordAttempt } from "../../src/lib/learning/store";
import { isAnswerCorrect, taskCorrectLabel } from "../../src/lib/learning/types";

const PRESETS = [
  { topicId: "math-quadratic", key: "clips.preset.quad" },
  { topicId: "phys-newton", key: "clips.preset.newton" },
  { topicId: "inf-python", key: "clips.preset.python" },
];

export default function ClipsScreen() {
  const { t, locale, palette } = useI18n();
  const { topics, state } = useLearning();
  const clipLocale = locale === "kk" ? "kk" : "ru";
  const [topicId, setTopicId] = useState("math-quadratic");
  const [clip, setClip] = useState<LearningClip | null>(null);
  const [source, setSource] = useState<"baked" | "ai" | "local">("baked");
  const [beat, setBeat] = useState(0);
  const [answer, setAnswer] = useState("");
  const [quizMsg, setQuizMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const weak = weakSpots(topics, state, 3);
  const quiz = clip ? findTask(topics, clip.quizTaskId) : null;

  function loadBaked(id: string) {
    const found = BAKED_CLIPS.find((item) => item.topicId === id && item.locale === clipLocale)
      ?? BAKED_CLIPS.find((item) => item.topicId === id)
      ?? localClipForTopic(id, clipLocale);
    setClip(found);
    setSource(found.baked ? "baked" : "local");
    setBeat(0);
    setAnswer("");
    setQuizMsg(null);
    void apiPost("/api/clips/events", { clipId: found.id, topicId: id, event: "start" }).catch(() => undefined);
  }

  useEffect(() => {
    loadBaked(topicId);
  }, [topicId, clipLocale]);

  async function generateLive() {
    setBusy(true);
    try {
      const data = await apiPost<{ clip: LearningClip; source?: "baked" | "ai" | "local" }>("/api/clips/generate", {
        topicId,
        locale: clipLocale,
      });
      setClip(data.clip);
      setSource(data.source ?? "ai");
      setBeat(0);
    } catch {
      const fallback = localClipForTopic(topicId, clipLocale);
      setClip(fallback);
      setSource("local");
    } finally {
      setBusy(false);
    }
  }

  const current = clip?.beats[beat];
  const isCheck = current?.kind === "check";
  const duration = useMemo(() => clip?.beats.reduce((sum, item) => sum + item.seconds, 0) ?? 46, [clip]);

  function submitQuiz() {
    if (!quiz || !clip) return;
    const correct = isAnswerCorrect(quiz, quiz.type === "single" ? Number(answer) : answer);
    recordAttempt({
      taskId: quiz.id,
      topicId: clip.topicId,
      skill: quiz.skill,
      difficulty: quiz.difficulty,
      correct,
      answer,
    });
    void apiPost("/api/clips/events", {
      clipId: clip.id,
      topicId: clip.topicId,
      event: correct ? "quiz_right" : "quiz_wrong",
    }).catch(() => undefined);
    if (correct) {
      setQuizMsg(t("clips.ok"));
      const next = weak[0]?.topicId && weak[0].topicId !== topicId ? weak[0].topicId : topicId;
      setTopicId(next);
    } else {
      setQuizMsg(t("clips.bad"));
      setBeat(0);
    }
  }

  return (
    <Screen>
      <Card>
        <Kicker>{t("clips.kicker")}</Kicker>
        <Title>{t("clips.title")}</Title>
        <Body>{t("clips.desc")}</Body>
        <Body>{t("clips.sourceLine", { source: t(`clips.source.${source}`) })} · {duration}s</Body>
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {PRESETS.map((item) => (
          <Chip key={item.topicId} label={t(item.key)} selected={topicId === item.topicId} onPress={() => setTopicId(item.topicId)} />
        ))}
        <Chip label={t("clips.live")} selected={source === "ai"} onPress={() => void generateLive()} />
      </View>

      {clip && current ? (
        <Card style={{ minHeight: 420, backgroundColor: palette.ink, borderColor: palette.ink }}>
          <Kicker>{t("clips.beatLine", { label: t(`clip.beat.${current.kind}`), a: beat + 1, b: clip.beats.length })}</Kicker>
          <Title>{current.title}</Title>
          <Body style={{ color: "#E5E7EB", fontSize: 18, lineHeight: 26 }}>{current.text}</Body>
          <SpeakButton text={`${current.title}. ${current.text}`} />
          {isCheck && quiz ? (
            <View style={{ gap: 8 }}>
              <Body style={{ color: "#E5E7EB" }}>{quiz.prompt}</Body>
              {quiz.type === "single" && quiz.options
                ? quiz.options.map((option, index) => (
                    <Chip key={option} label={option} selected={answer === String(index)} onPress={() => setAnswer(String(index))} />
                  ))
                : <Field label={t("answer.short")} value={answer} onChangeText={setAnswer} />}
              <PrimaryButton label={t("clips.answer")} onPress={submitQuiz} />
              {quizMsg ? <Body style={{ color: "#FFFFFF" }}>{quizMsg}</Body> : null}
              {!quizMsg ? <Body style={{ color: "#94A3B8" }}>{t("diag.rightAnswer", { answer: taskCorrectLabel(quiz) }).replace(taskCorrectLabel(quiz), "…")}</Body> : null}
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <SecondaryButton label={t("clips.restart")} onPress={() => setBeat(0)} />
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  label={t("clips.next")}
                  onPress={() => {
                    if (beat + 1 >= (clip.beats.length)) {
                      void apiPost("/api/clips/events", { clipId: clip.id, topicId: clip.topicId, event: "complete" }).catch(() => undefined);
                    }
                    setBeat((n) => Math.min(n + 1, clip.beats.length - 1));
                  }}
                />
              </View>
            </View>
          )}
        </Card>
      ) : (
        <Card>
          <Body>{busy ? t("clips.building") : t("clips.loading")}</Body>
        </Card>
      )}
      <ErrorText message={null} />
    </Screen>
  );
}
