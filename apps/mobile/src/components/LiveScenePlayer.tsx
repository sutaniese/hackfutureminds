import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import * as Speech from "expo-speech";
import {
  CLIP_STAGE,
  sceneDurationMs,
  type LiveClipScene,
  type LiveClipScript,
} from "@pathwise/shared";
import { useI18n } from "../context/I18nContext";
import { apiPost } from "../lib/api";
import { recordAttempt } from "../lib/learning/store";
import { isAnswerCorrect, type Task } from "../lib/learning/types";
import { Body, Chip, PrimaryButton } from "./ui";

function taskFromScript(script: LiveClipScript, topicId: string): Task {
  return {
    id: `${topicId}-clip-quiz`,
    topicId,
    type: "single",
    difficulty: 1,
    skill: script.quiz.skillId,
    prompt: script.quiz.question,
    options: [...script.quiz.options],
    answer: script.quiz.correctIndex,
    explanation: script.quiz.explanation,
    minutes: 1,
  };
}

function linesOf(scene: LiveClipScene): string[] {
  return (scene.body || scene.narration)
    .split(/\n+|;\s+|[.!?…]\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 2)
    .slice(0, 4);
}

async function speakScene(
  text: string,
  language: "ru" | "kk",
  onDone: () => void,
  onError: () => void,
) {
  let voices: Speech.Voice[] = [];
  try {
    voices = await Speech.getAvailableVoicesAsync();
  } catch {
    voices = [];
  }
  const want = language === "kk" ? ["kk", "kaz"] : ["ru"];
  const match = voices.find((voice) => {
    const hay = `${voice.language} ${voice.name}`.toLowerCase();
    return want.some((code) => hay.includes(code));
  });
  const ru = voices.find((voice) => voice.language.toLowerCase().startsWith("ru"));
  const voice = match ?? (language === "kk" ? ru : undefined);
  Speech.stop();
  Speech.speak(text, {
    language: voice?.language || "ru-RU",
    voice: voice?.identifier,
    onDone,
    onStopped: () => undefined,
    onError,
  });
  return true;
}

function SceneBlock({ scene, accent }: { scene: LiveClipScene; accent: string }) {
  if (scene.visual === "formula") {
    return (
      <View style={{ gap: 12 }}>
        <Text style={{ color: accent, fontWeight: "800", letterSpacing: 1.4 }}>{CLIP_STAGE.wordmark}</Text>
        <Text style={{ color: CLIP_STAGE.white, fontSize: 26, fontWeight: "800", lineHeight: 32 }}>{scene.heading}</Text>
        {scene.formula ? (
          <View style={{ backgroundColor: "#100E1C", borderLeftWidth: 8, borderLeftColor: CLIP_STAGE.purple, borderRadius: 16, padding: 14 }}>
            <Text style={{ color: CLIP_STAGE.white, fontFamily: "monospace", fontSize: 18, fontWeight: "700" }}>{scene.formula}</Text>
          </View>
        ) : null}
        {scene.body ? <Text style={{ color: CLIP_STAGE.muted, fontSize: 16, fontWeight: "600" }}>{scene.body}</Text> : null}
      </View>
    );
  }

  if (scene.visual === "compare") {
    const parts = (scene.body || scene.narration).split(/\n+|—|–|\svs\.?\s/i).map((part) => part.trim()).filter(Boolean);
    return (
      <View style={{ gap: 12 }}>
        <Text style={{ color: CLIP_STAGE.white, fontSize: 24, fontWeight: "800" }}>{scene.heading}</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[parts[0] || scene.narration, parts[1] || parts[0] || scene.narration].map((part, index) => (
            <View key={`${part}-${index}`} style={{ flex: 1, backgroundColor: CLIP_STAGE.card, borderColor: CLIP_STAGE.cardLine, borderWidth: 2, borderRadius: 18, padding: 12 }}>
              <Text style={{ color: accent, fontWeight: "800" }}>{index === 0 ? "A" : "B"}</Text>
              <Text style={{ color: CLIP_STAGE.white, fontWeight: "700", marginTop: 8 }}>{part}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  const items = linesOf(scene);
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: CLIP_STAGE.white, fontSize: 24, fontWeight: "800" }}>{scene.heading}</Text>
      {items.map((item, index) => (
        <View key={`${item}-${index}`} style={{ backgroundColor: CLIP_STAGE.card, borderColor: CLIP_STAGE.cardLine, borderWidth: 2, borderRadius: 18, padding: 12, flexDirection: "row", gap: 10 }}>
          {scene.visual === "diagram" ? (
            <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: accent, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>{index + 1}</Text>
            </View>
          ) : null}
          <Text style={{ color: CLIP_STAGE.white, fontWeight: "700", flex: 1 }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function LiveScenePlayer({
  script,
  topicId,
  quizTask,
  onWrongAnswer,
}: {
  script: LiveClipScript;
  topicId: string;
  quizTask?: Task | null;
  onWrongAnswer?: () => void;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<"idle" | "play" | "paused" | "quiz">("idle");
  const [sceneIndex, setSceneIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [quizMsg, setQuizMsg] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);
  const speakingRef = useRef(false);
  const sceneIndexRef = useRef(0);
  const phaseRef = useRef(phase);
  const quiz = quizTask ?? taskFromScript(script, topicId);
  const scene = script.scenes[sceneIndex];
  const progress = script.scenes.length ? (sceneIndex + (phase === "quiz" ? 1 : 0)) / script.scenes.length : 0;

  function fire(event: "start" | "complete" | "drop" | "quiz_right" | "quiz_wrong") {
    void apiPost("/api/clips/events", { clipId: `live-${topicId}`, topicId, event }).catch(() => undefined);
  }

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    sceneIndexRef.current = sceneIndex;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, [fade, sceneIndex]);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function goNext() {
    if (phaseRef.current === "paused") return;
    const index = sceneIndexRef.current;
    if (index >= script.scenes.length - 1) {
      if (!completedRef.current) {
        completedRef.current = true;
        fire("complete");
      }
      generationRef.current += 1;
      speakingRef.current = false;
      Speech.stop();
      clearTimer();
      setPhase("quiz");
      return;
    }
    setSceneIndex(index + 1);
  }

  useEffect(() => {
    if (phase !== "play") return;
    const current = script.scenes[sceneIndex];
    if (!current) return;
    const token = generationRef.current + 1;
    generationRef.current = token;
    clearTimer();
    Speech.stop();
    speakingRef.current = false;

    const tryAdvance = (reason: "speech_end" | "speech_error" | "fallback_timer") => {
      if (generationRef.current !== token) return;
      if (phaseRef.current === "paused") return;
      if (speakingRef.current && reason === "fallback_timer") return;
      speakingRef.current = false;
      goNext();
    };

    let attempts = 0;
    const start = () => {
      attempts += 1;
      void speakScene(
        current.narration,
        script.language,
        () => tryAdvance("speech_end"),
        () => {
          if (generationRef.current !== token) return;
          if (attempts < 2) start();
          else tryAdvance("speech_error");
        },
      )
        .then((started) => {
          if (generationRef.current !== token) return;
          if (started) {
            speakingRef.current = true;
            clearTimer();
            return;
          }
          timerRef.current = setTimeout(() => tryAdvance("fallback_timer"), sceneDurationMs(current.narration));
        })
        .catch(() => {
          if (generationRef.current !== token) return;
          timerRef.current = setTimeout(() => tryAdvance("fallback_timer"), sceneDurationMs(current.narration));
        });
    };
    start();
    return () => {
      generationRef.current += 1;
      speakingRef.current = false;
      clearTimer();
      Speech.stop();
    };
  }, [phase, sceneIndex, script.language, script.scenes]);

  useEffect(() => {
    return () => {
      Speech.stop();
      if (startedRef.current && !completedRef.current) fire("drop");
    };
  }, [topicId]);

  function start() {
    if (!startedRef.current) {
      startedRef.current = true;
      fire("start");
    }
    setPhase("play");
  }

  function submitQuiz() {
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
    setQuizMsg(correct ? t("clips.ok") : t("clips.bad"));
    if (!correct) onWrongAnswer?.();
  }

  return (
    <View style={{ backgroundColor: CLIP_STAGE.ink, borderRadius: 28, padding: 16, gap: 14 }}>
      <View style={{ height: 6, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.12)" }}>
        <View style={{ width: `${Math.round(progress * 100)}%`, height: 6, borderRadius: 99, backgroundColor: CLIP_STAGE.purple }} />
      </View>

      {phase === "quiz" ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: CLIP_STAGE.purpleSoft, fontWeight: "800" }}>{t("clips.quizNow")}</Text>
          <Body style={{ color: CLIP_STAGE.white }}>{quiz.prompt}</Body>
          {quiz.options?.map((option, index) => (
            <Chip key={option} label={option} selected={answer === String(index)} onPress={() => setAnswer(String(index))} />
          ))}
          <PrimaryButton label={t("clips.answer")} onPress={submitQuiz} disabled={answer.trim() === ""} />
          {quizMsg ? <Body style={{ color: CLIP_STAGE.white }}>{quizMsg}</Body> : null}
        </View>
      ) : (
        <>
          <Animated.View style={{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            {scene ? <SceneBlock scene={scene} accent={CLIP_STAGE.purple} /> : null}
          </Animated.View>
          <View style={{ backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 16, padding: 12 }}>
            <Text style={{ color: CLIP_STAGE.purpleSoft, fontWeight: "800", fontSize: 11 }}>
              {t("clips.beatLine", { label: scene?.heading ?? "", a: sceneIndex + 1, b: script.scenes.length })}
            </Text>
            <Text style={{ color: CLIP_STAGE.white, fontWeight: "600", marginTop: 6, lineHeight: 22 }}>{scene?.narration}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={phase === "play" ? () => {
                generationRef.current += 1;
                speakingRef.current = false;
                Speech.stop();
                clearTimer();
                setPhase("paused");
              } : start}
              style={{ flex: 1, minHeight: 48, borderRadius: 999, backgroundColor: CLIP_STAGE.purple, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>
                {phase === "play" ? t("clips.pause") : t("clips.tapToPlay")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                generationRef.current += 1;
                speakingRef.current = false;
                Speech.stop();
                clearTimer();
                completedRef.current = false;
                setQuizMsg(null);
                setAnswer("");
                setSceneIndex(0);
                setPhase("play");
                if (!startedRef.current) {
                  startedRef.current = true;
                  fire("start");
                }
              }}
              style={{ flex: 1, minHeight: 48, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>{t("clips.replay")}</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
