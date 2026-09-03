import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { clipProductionUrl, DEMO_BUNDLED_CLIP_TOPICS, videoClipFor } from "@pathwise/shared";
import { Screen } from "../../src/components/Screen";
import { Body, Card, Chip, ErrorText, Field, Kicker, PrimaryButton, SecondaryButton, Title } from "../../src/components/ui";
import { useI18n } from "../../src/context/I18nContext";
import { useLearning } from "../../src/context/LearningContext";
import { apiPost } from "../../src/lib/api";
import { getApiUrl } from "../../src/lib/env";
import { BAKED_CLIPS, localClipForTopic } from "../../src/lib/learning/clips";
import type { LearningClip } from "../../src/lib/learning/clips/types";
import { BASE_TOPICS, findTask, findTopic, SUBJECTS } from "../../src/lib/learning/catalog";
import { weakSpots } from "../../src/lib/learning/recommend";
import { recordAttempt } from "../../src/lib/learning/store";
import { isAnswerCorrect, taskCorrectLabel } from "../../src/lib/learning/types";

const BUNDLED: Record<string, number> = {
  "math-quadratic": require("../../assets/clips/math-quadratic.mp4"),
  "phys-newton": require("../../assets/clips/phys-newton.mp4"),
  "inf-python": require("../../assets/clips/inf-python.mp4"),
};

function remoteUri(topicId: string, locale: "ru" | "kk"): string | null {
  return clipProductionUrl(topicId, locale, getApiUrl());
}

export default function ClipsScreen() {
  const { t, locale, palette } = useI18n();
  const { topics, state } = useLearning();
  const clipLocale = locale === "kk" ? "kk" : "ru";
  const [topicId, setTopicId] = useState("math-quadratic");
  const [phase, setPhase] = useState<"video" | "quiz" | "fallback">("video");
  const [clip, setClip] = useState<LearningClip | null>(null);
  const [source, setSource] = useState<"video" | "baked" | "ai" | "local">("video");
  const [beat, setBeat] = useState(0);
  const [answer, setAnswer] = useState("");
  const [quizMsg, setQuizMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [useBundled, setUseBundled] = useState(false);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const clipIdRef = useRef("clip-math-quadratic");

  const weak = weakSpots(topics, state, 3);
  const videoMeta = videoClipFor(topicId, clipLocale);
  const topic = findTopic(topics, topicId) ?? findTopic(BASE_TOPICS, topicId);
  const quizTaskId = clip?.quizTaskId || videoMeta?.quizTaskId || topic?.tasks[0]?.id || "";
  const quiz = quizTaskId ? findTask(topics, quizTaskId) ?? findTask(BASE_TOPICS, quizTaskId) : null;
  const uri = useBundled && BUNDLED[topicId]
    ? BUNDLED[topicId]
    : remoteUri(topicId, clipLocale) ?? BUNDLED[topicId] ?? null;
  const player = useVideoPlayer(uri ?? BUNDLED["math-quadratic"], (instance) => {
    instance.loop = false;
    if (phase === "video") instance.play();
  });

  function fire(event: "start" | "complete" | "drop" | "quiz_right" | "quiz_wrong") {
    void apiPost("/api/clips/events", { clipId: clipIdRef.current, topicId, event }).catch(() => undefined);
  }

  function resetPlayFlags(id: string) {
    if (startedRef.current && !completedRef.current) fire("drop");
    startedRef.current = false;
    completedRef.current = false;
    clipIdRef.current = `clip-${id}${clipLocale === "kk" ? "-kk" : ""}`;
    setAnswer("");
    setQuizMsg(null);
    setBeat(0);
  }

  function loadBaked(id: string) {
    const found = BAKED_CLIPS.find((item) => item.topicId === id && item.locale === clipLocale)
      ?? BAKED_CLIPS.find((item) => item.topicId === id)
      ?? localClipForTopic(id, clipLocale);
    setClip(found);
    setSource(found.baked ? "baked" : "local");
    setPhase("fallback");
    clipIdRef.current = found.id;
    fire("start");
    startedRef.current = true;
  }

  function selectTopic(id: string, forceLive = false) {
    resetPlayFlags(id);
    setTopicId(id);
    setUseBundled(false);
    if (forceLive || !videoClipFor(id, clipLocale)) {
      if (forceLive) void generateLive(id);
      else loadBaked(id);
      return;
    }
    setPhase("video");
    setSource("video");
    setClip(null);
  }

  async function generateLive(id = topicId) {
    setBusy(true);
    setPhase("fallback");
    try {
      const data = await apiPost<{ clip: LearningClip; source?: "baked" | "ai" | "local" }>("/api/clips/generate", {
        topicId: id,
        locale: clipLocale,
      });
      setClip(data.clip);
      setSource(data.source ?? "ai");
      clipIdRef.current = data.clip.id;
      fire("start");
      startedRef.current = true;
    } catch {
      loadBaked(id);
    } finally {
      setBusy(false);
    }
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

  useEventListener(player, "statusChange", ({ status, error }) => {
    if (status === "error" && phase === "video") {
      if (!useBundled && BUNDLED[topicId]) {
        setUseBundled(true);
        return;
      }
      loadBaked(topicId);
      if (error) {
        /* fallback slideshow */
      }
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
      const next = weak[0]?.topicId && weak[0].topicId !== topicId ? weak[0].topicId : topicId;
      selectTopic(next);
    } else {
      setQuizMsg(t("clips.bad"));
      selectTopic(topicId);
    }
  }

  const current = clip?.beats[beat];
  const isCheck = current?.kind === "check";
  const duration = useMemo(() => clip?.beats.reduce((sum, item) => sum + item.seconds, 0) ?? 52, [clip]);
  const demoHint = DEMO_BUNDLED_CLIP_TOPICS.includes(topicId as (typeof DEMO_BUNDLED_CLIP_TOPICS)[number]);

  return (
    <Screen>
      <Card>
        <Kicker>{t("clips.kicker")}</Kicker>
        <Title>{t("clips.title")}</Title>
        <Body>{t("clips.desc")}</Body>
        <Body>{t("clips.sourceLine", { source: t(`clips.source.${source}`) })}{phase !== "video" ? ` · ${duration}s` : ""}</Body>
      </Card>

      {SUBJECTS.map((subject) => (
        <View key={subject.id} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <Body style={{ fontSize: 12, fontWeight: "800" }}>{subject.title}</Body>
          {BASE_TOPICS.filter((item) => item.subjectId === subject.id).map((item) => (
            <Chip key={item.id} label={item.title} selected={topicId === item.id} onPress={() => selectTopic(item.id)} />
          ))}
        </View>
      ))}
      {topics.filter((item) => item.custom).length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <Body style={{ fontSize: 12, fontWeight: "800" }}>{t("learn.teacherTopics")}</Body>
          {topics.filter((item) => item.custom).map((item) => (
            <Chip key={item.id} label={item.title} selected={topicId === item.id} onPress={() => selectTopic(item.id)} />
          ))}
        </View>
      ) : null}
      <Chip label={t("clips.live")} selected={source === "ai"} onPress={() => selectTopic(topicId, true)} />

      {phase === "video" ? (
        <Card style={{ padding: 0, overflow: "hidden", backgroundColor: "#07060F", borderColor: "#07060F" }}>
          <VideoView
            player={player}
            style={{ width: "100%", aspectRatio: 9 / 16, backgroundColor: "#07060F" }}
            nativeControls
            contentFit="cover"
          />
          {demoHint ? <Body style={{ color: "#C7C3E0", padding: 12 }}>{t("clips.source.video")}</Body> : null}
        </Card>
      ) : null}

      {phase === "quiz" && quiz ? (
        <Card style={{ backgroundColor: palette.ink, borderColor: palette.ink }}>
          <Kicker>{t("clips.quizNow")}</Kicker>
          <Title>{topic?.title ?? topicId}</Title>
          <Body style={{ color: "#E5E7EB" }}>{quiz.prompt}</Body>
          {quiz.type === "single" && quiz.options
            ? quiz.options.map((option, index) => (
                <Chip key={option} label={option} selected={answer === String(index)} onPress={() => setAnswer(String(index))} />
              ))
            : <Field label={t("answer.short")} value={answer} onChangeText={setAnswer} multiline />}
          <PrimaryButton label={t("clips.answer")} onPress={submitQuiz} disabled={answer.trim() === ""} />
          {quizMsg ? <Body style={{ color: "#FFFFFF" }}>{quizMsg}</Body> : null}
          {!quizMsg ? <Body style={{ color: "#94A3B8" }}>{t("diag.rightAnswer", { answer: taskCorrectLabel(quiz) }).replace(taskCorrectLabel(quiz), "…")}</Body> : null}
        </Card>
      ) : null}

      {phase === "fallback" ? (
        clip && current ? (
          <Card style={{ minHeight: 420, backgroundColor: palette.ink, borderColor: palette.ink }}>
            <Kicker>{t("clips.beatLine", { label: t(`clip.beat.${current.kind}`), a: beat + 1, b: clip.beats.length })}</Kicker>
            <Title>{current.title}</Title>
            <Body style={{ color: "#E5E7EB", fontSize: 18, lineHeight: 26 }}>{current.text}</Body>
            {isCheck && quiz ? (
              <View style={{ gap: 8 }}>
                <Body style={{ color: "#E5E7EB" }}>{quiz.prompt}</Body>
                {quiz.type === "single" && quiz.options
                  ? quiz.options.map((option, index) => (
                      <Chip key={option} label={option} selected={answer === String(index)} onPress={() => setAnswer(String(index))} />
                    ))
                  : <Field label={t("answer.short")} value={answer} onChangeText={setAnswer} multiline />}
                <PrimaryButton label={t("clips.answer")} onPress={submitQuiz} disabled={answer.trim() === ""} />
                {quizMsg ? <Body style={{ color: "#FFFFFF" }}>{quizMsg}</Body> : null}
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <SecondaryButton label={t("clips.restart")} onPress={() => setBeat(0)} />
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label={t("clips.next")}
                    onPress={() => {
                      if (beat + 1 >= clip.beats.length) fire("complete");
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
        )
      ) : null}
      <ErrorText message={null} />
    </Screen>
  );
}
