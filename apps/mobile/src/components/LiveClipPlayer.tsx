import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import * as Speech from "expo-speech";
import {
  liveClipQuizTask,
  sceneDurationMs,
  type LiveClipScene,
  type LiveClipScript,
} from "@pathwise/shared";
import { Body, Card, Chip, Kicker, PrimaryButton } from "./ui";
import { useI18n } from "../context/I18nContext";
import { apiPost } from "../lib/api";
import { recordAttempt } from "../lib/learning/store";
import { isAnswerCorrect } from "../lib/learning/types";

function splitLines(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n|•|;/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function SceneVisual({ scene }: { scene: LiveClipScene }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [fade, scene.id]);

  const items = splitLines(scene.body || scene.narration);
  const style = { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] };

  if (scene.visual === "formula") {
    return (
      <Animated.View style={[{ backgroundColor: "#100E1C", borderLeftWidth: 6, borderLeftColor: "#6C63FF", borderRadius: 16, padding: 16 }, style]}>
        <Body style={{ color: "#F7F6FF", fontWeight: "800" }}>{scene.formula || scene.body || scene.heading}</Body>
      </Animated.View>
    );
  }
  if (scene.visual === "compare") {
    const left = items[0] || scene.heading;
    const right = items[1] || scene.formula || scene.narration;
    return (
      <Animated.View style={[{ flexDirection: "row", gap: 8 }, style]}>
        <View style={{ flex: 1, backgroundColor: "#161326", borderRadius: 14, padding: 12 }}>
          <Body style={{ color: "#A99CFF", fontWeight: "800" }}>A</Body>
          <Body style={{ color: "#F7F6FF" }}>{left}</Body>
        </View>
        <View style={{ flex: 1, backgroundColor: "#161326", borderRadius: 14, padding: 12 }}>
          <Body style={{ color: "#43D19E", fontWeight: "800" }}>B</Body>
          <Body style={{ color: "#F7F6FF" }}>{right}</Body>
        </View>
      </Animated.View>
    );
  }
  if (scene.visual === "bullets") {
    return (
      <Animated.View style={[{ gap: 8 }, style]}>
        {items.map((item, index) => (
          <View key={item} style={{ backgroundColor: "#161326", borderRadius: 14, padding: 12 }}>
            <Body style={{ color: "#F7F6FF" }}>{`${index + 1}. ${item}`}</Body>
          </View>
        ))}
      </Animated.View>
    );
  }
  return (
    <Animated.View style={[{ gap: 8 }, style]}>
      {(items.length >= 2 ? items : [scene.heading, scene.body || scene.narration]).slice(0, 3).map((item) => (
        <View key={item} style={{ backgroundColor: "#161326", borderRadius: 14, padding: 12, alignItems: "center" }}>
          <Body style={{ color: "#F7F6FF", fontWeight: "700" }}>{item}</Body>
        </View>
      ))}
    </Animated.View>
  );
}

async function pickLanguage(requested: "ru" | "kk"): Promise<{ language: string; fallback: boolean }> {
  if (requested === "ru") return { language: "ru-RU", fallback: false };
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const kazakh = voices.find((voice) => /^kk/i.test(voice.language) || /kazakh/i.test(voice.name));
    if (kazakh) return { language: kazakh.language, fallback: false };
  } catch {
    /* keep captions, speak Russian */
  }
  return { language: "ru-RU", fallback: true };
}

export function LiveClipPlayer({
  script,
  topicId,
  onWrongAnswer,
}: {
  script: LiveClipScript;
  topicId: string;
  onWrongAnswer?: () => void;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<"idle" | "play" | "quiz">("idle");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [answer, setAnswer] = useState("");
  const [quizMsg, setQuizMsg] = useState<string | null>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const spokenRef = useRef(false);
  const pausedRef = useRef(false);

  const scene = script.scenes[index];
  const quiz = liveClipQuizTask(script, topicId);

  function fire(event: "start" | "complete" | "drop" | "quiz_right" | "quiz_wrong" | "stuck") {
    void apiPost("/api/clips/events", { clipId: `live-${topicId}`, topicId, event }).catch(() => undefined);
  }

  useEffect(() => {
    return () => {
      Speech.stop();
      if (startedRef.current && !completedRef.current) fire("drop");
    };
  }, [topicId]);

  useEffect(() => {
    if (phase !== "play" || paused || !scene) return;
    spokenRef.current = false;
    let cancelled = false;
    const expected = sceneDurationMs(scene.narration);
    void pickLanguage(script.language).then((pick) => {
      if (cancelled) return;
      setVoiceNote(pick.fallback && script.language === "kk" ? t("clips.voiceKkFallback") : null);
      Speech.stop();
      Speech.speak(scene.narration, {
        language: pick.language,
        onDone: () => {
          spokenRef.current = true;
          if (!cancelled && !pausedRef.current) goNext();
        },
        onError: () => {
          spokenRef.current = true;
          if (!cancelled && !pausedRef.current) goNext();
        },
      });
    });
    const fallback = setTimeout(() => {
      if (!cancelled && !pausedRef.current && !spokenRef.current) goNext();
    }, expected);
    const stuck = setTimeout(() => {
      if (!cancelled && !spokenRef.current) fire("stuck");
    }, expected * 2);
    return () => {
      cancelled = true;
      clearTimeout(fallback);
      clearTimeout(stuck);
      Speech.stop();
    };
    // goNext is stable enough via index closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, scene?.id]);

  function goNext() {
    setIndex((current) => {
      if (current >= script.scenes.length - 1) {
        if (!completedRef.current) {
          completedRef.current = true;
          fire("complete");
        }
        setPhase("quiz");
        return current;
      }
      return current + 1;
    });
  }

  function start() {
    if (!startedRef.current) {
      startedRef.current = true;
      fire("start");
    }
    pausedRef.current = false;
    setPaused(false);
    setPhase("play");
  }

  function replay() {
    Speech.stop();
    completedRef.current = false;
    setIndex(0);
    setAnswer("");
    setQuizMsg(null);
    start();
  }

  if (phase === "idle") {
    return (
      <Card style={{ backgroundColor: "#07060F", borderColor: "#07060F" }}>
        <Kicker>{t("clips.liveLabel")}</Kicker>
        <Body style={{ color: "#F7F6FF", fontSize: 22, fontWeight: "800" }}>{script.title}</Body>
        <Body style={{ color: "#C7C3E0" }}>{t("clips.tapStart")}</Body>
        <PrimaryButton label={t("topic.watchClip")} onPress={start} />
      </Card>
    );
  }

  if (phase === "quiz") {
    return (
      <Card>
        <Kicker>{t("clips.quizNow")}</Kicker>
        <Body>{quiz.prompt}</Body>
        {quiz.options.map((option, optionIndex) => (
          <Chip
            key={option}
            label={option}
            selected={answer === String(optionIndex)}
            onPress={() => setAnswer(String(optionIndex))}
          />
        ))}
        <PrimaryButton
          label={t("clips.answer")}
          disabled={answer === ""}
          onPress={() => {
            const correct = isAnswerCorrect(
              { ...quiz, type: "single" as const },
              Number(answer),
            );
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
          }}
        />
        {quizMsg ? <Body>{quizMsg}</Body> : null}
        <PrimaryButton label={t("clips.restart")} onPress={replay} />
      </Card>
    );
  }

  return (
    <Card style={{ backgroundColor: "#07060F", borderColor: "#07060F" }}>
      <Kicker>{t("clips.sceneProgress", { a: index + 1, b: script.scenes.length })}</Kicker>
      <Body style={{ color: "#F7F6FF", fontSize: 22, fontWeight: "800" }}>{scene.heading}</Body>
      <SceneVisual scene={scene} />
      <Body style={{ color: "#F7F6FF", marginTop: 12 }}>{scene.narration}</Body>
      {voiceNote ? <Body style={{ color: "#C7C3E0" }}>{voiceNote}</Body> : null}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <Pressable
          onPress={() => {
            const next = !paused;
            pausedRef.current = next;
            setPaused(next);
            if (next) Speech.pause();
            else Speech.resume();
          }}
          style={{ flex: 1, minHeight: 44, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}
        >
          <Body style={{ color: "#F7F6FF", fontWeight: "800" }}>{paused ? t("clips.resume") : t("clips.pause")}</Body>
        </Pressable>
        <Pressable
          onPress={replay}
          style={{ flex: 1, minHeight: 44, borderRadius: 999, backgroundColor: "#6C63FF", alignItems: "center", justifyContent: "center" }}
        >
          <Body style={{ color: "#FFFFFF", fontWeight: "800" }}>{t("clips.restart")}</Body>
        </Pressable>
      </View>
    </Card>
  );
}
