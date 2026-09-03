import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { clipProductionUrl, videoClipFor } from "@pathwise/shared";
import { Body, Card, Chip, Field, Kicker, PrimaryButton, Title } from "./ui";
import { useI18n } from "../context/I18nContext";
import { useLearning } from "../context/LearningContext";
import { apiPost } from "../lib/api";
import { getApiUrl } from "../lib/env";
import { BASE_TOPICS, findTask, findTopic } from "../lib/learning/catalog";
import { recordAttempt } from "../lib/learning/store";
import { isAnswerCorrect, taskCorrectLabel } from "../lib/learning/types";

const BUNDLED: Record<string, number> = {
  "math-quadratic": require("../../assets/clips/math-quadratic.mp4"),
  "phys-newton": require("../../assets/clips/phys-newton.mp4"),
  "inf-python": require("../../assets/clips/inf-python.mp4"),
};

export function TopicClipPlayer({
  topicId,
  onWrongAnswer,
}: {
  topicId: string;
  onWrongAnswer?: () => void;
}) {
  const { t, locale, palette } = useI18n();
  const { topics } = useLearning();
  const clipLocale = locale === "kk" ? "kk" : "ru";
  const [phase, setPhase] = useState<"video" | "quiz">("video");
  const [answer, setAnswer] = useState("");
  const [quizMsg, setQuizMsg] = useState<string | null>(null);
  const [useBundled, setUseBundled] = useState(false);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const clipIdRef = useRef(`clip-${topicId}${clipLocale === "kk" ? "-kk" : ""}`);

  const videoMeta = videoClipFor(topicId, clipLocale);
  const topic = findTopic(topics, topicId) ?? findTopic(BASE_TOPICS, topicId);
  const quizTaskId = videoMeta?.quizTaskId || topic?.tasks[0]?.id || "";
  const quiz = quizTaskId ? findTask(topics, quizTaskId) ?? findTask(BASE_TOPICS, quizTaskId) : null;
  const uri =
    useBundled && BUNDLED[topicId]
      ? BUNDLED[topicId]
      : clipProductionUrl(topicId, clipLocale, getApiUrl()) ?? BUNDLED[topicId] ?? null;
  const player = useVideoPlayer(uri ?? BUNDLED["math-quadratic"], (instance) => {
    instance.loop = false;
    instance.play();
  });

  function fire(event: "start" | "complete" | "drop" | "quiz_right" | "quiz_wrong") {
    void apiPost("/api/clips/events", { clipId: clipIdRef.current, topicId, event }).catch(() => undefined);
  }

  useEffect(() => {
    if (!uri || phase !== "video") return;
    player.replace(uri);
    player.play();
  }, [topicId, uri, player, phase]);

  useEventListener(player, "playingChange", ({ isPlaying }) => {
    if (isPlaying && !startedRef.current && phase === "video") {
      startedRef.current = true;
      fire("start");
    }
  });

  useEventListener(player, "playToEnd", () => {
    if (!completedRef.current) {
      completedRef.current = true;
      fire("complete");
    }
    setPhase("quiz");
  });

  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "error" && phase === "video" && !useBundled && BUNDLED[topicId]) {
      setUseBundled(true);
    }
  });

  useEffect(() => {
    return () => {
      if (startedRef.current && !completedRef.current) {
        void apiPost("/api/clips/events", { clipId: clipIdRef.current, topicId, event: "drop" }).catch(() => undefined);
      }
    };
  }, [topicId]);

  function submitQuiz() {
    if (!quiz) return;
    const correct = isAnswerCorrect(quiz, quiz.type === "single" ? Number(answer) : answer);
    recordAttempt({
      taskId: quiz.id,
      topicId,
      skill: quiz.skill,
      difficulty: quiz.difficulty,
      correct,
      answer,
    });
    fire(correct ? "quiz_right" : "quiz_wrong");
    if (correct) {
      setQuizMsg(t("clips.ok"));
      return;
    }
    setQuizMsg(t("clips.bad"));
    onWrongAnswer?.();
  }

  return (
    <Card>
      <Kicker>{t("clips.kicker")}</Kicker>
      <Title>{topic?.title ?? topicId}</Title>
      {phase === "video" ? (
        <Card style={{ padding: 0, overflow: "hidden", backgroundColor: "#07060F", borderColor: "#07060F" }}>
          <VideoView
            player={player}
            style={{ width: "100%", aspectRatio: 9 / 16, backgroundColor: "#07060F" }}
            nativeControls
            contentFit="cover"
          />
        </Card>
      ) : null}

      {phase === "quiz" && quiz ? (
        <Card style={{ backgroundColor: palette.ink, borderColor: palette.ink }}>
          <Kicker>{t("clips.quizNow")}</Kicker>
          <Body style={{ color: "#E5E7EB" }}>{quiz.prompt}</Body>
          {quiz.type === "single" && quiz.options
            ? quiz.options.map((option, index) => (
                <Chip key={option} label={option} selected={answer === String(index)} onPress={() => setAnswer(String(index))} />
              ))
            : <Field label={t("answer.short")} value={answer} onChangeText={setAnswer} />}
          <PrimaryButton label={t("clips.answer")} onPress={submitQuiz} />
          {quizMsg ? <Body style={{ color: "#FFFFFF" }}>{quizMsg}</Body> : null}
          {!quizMsg ? (
            <Body style={{ color: "#94A3B8" }}>
              {t("diag.rightAnswer", { answer: taskCorrectLabel(quiz) }).replace(taskCorrectLabel(quiz), "…")}
            </Body>
          ) : null}
        </Card>
      ) : null}
      {phase === "quiz" && !quiz ? <Body>{t("clips.loading")}</Body> : null}
      <View />
    </Card>
  );
}
