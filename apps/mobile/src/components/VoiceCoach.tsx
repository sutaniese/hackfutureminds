import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import { usePathname, useRouter } from "expo-router";
import { useI18n } from "../context/I18nContext";
import { useAuth } from "../context/AuthContext";
import { useLearning } from "../context/LearningContext";
import { apiPost } from "../lib/api";
import { getAccessToken } from "../lib/auth";
import { getApiUrl } from "../lib/env";
import { colors, tap } from "../lib/theme";

type Tab = "coach" | "control";
type Phase = "idle" | "listening" | "processing" | "speaking" | "error";
type Turn = { role: "user" | "assistant"; text: string };

function commandSpeak(raw: unknown): { action?: string; target?: string; speak: string } {
  if (!raw || typeof raw !== "object") return { speak: "" };
  const row = raw as { action?: unknown; target?: unknown; speak?: unknown };
  return {
    action: typeof row.action === "string" ? row.action : undefined,
    target: typeof row.target === "string" ? row.target : undefined,
    speak: typeof row.speak === "string" ? row.speak : "",
  };
}

function humanError(raw: string, fallback: string): string {
  if (/json|groq|401|api key/i.test(raw)) return fallback;
  return raw.slice(0, 160) || fallback;
}

export function VoiceCoach() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const learning = useLearning();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("coach");
  const [phase, setPhase] = useState<Phase>("idle");
  const [typed, setTyped] = useState("");
  const [history, setHistory] = useState<Turn[]>([]);
  const [transcript, setTranscript] = useState("");
  const [heard, setHeard] = useState("");
  const [micDenied, setMicDenied] = useState(false);
  const [mute, setMute] = useState(false);
  const [continuous, setContinuous] = useState(false);
  const [commandLine, setCommandLine] = useState("");
  const recordingRef = useRef<Audio.Recording | null>(null);
  const tokenRef = useRef(0);
  const lastSoundRef = useRef(0);
  const heardSoundRef = useRef(false);
  const silenceTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const bump = () => {
    tokenRef.current += 1;
    return tokenRef.current;
  };

  const stopSpeech = useCallback(() => {
    Speech.stop();
  }, []);

  const stopRec = useCallback(async (keepBlob = true) => {
    if (silenceTimer.current) {
      clearInterval(silenceTimer.current);
      silenceTimer.current = null;
    }
    const rec = recordingRef.current;
    recordingRef.current = null;
    if (!rec) return null;
    try {
      await rec.stopAndUnloadAsync();
      if (!keepBlob) return null;
      return rec.getURI();
    } catch {
      return null;
    }
  }, []);

  const transcribe = useCallback(
    async (uri: string) => {
      const form = new FormData();
      form.append("audio", { uri, name: "voice.m4a", type: "audio/m4a" } as unknown as Blob);
      form.append("locale", locale);
      const headers: Record<string, string> = { Accept: "application/json" };
      const token = getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`${getApiUrl()}/api/voice-transcribe`, { method: "POST", headers, body: form });
      const json = (await response.json()) as { transcript?: string; error?: string };
      return json.transcript?.trim() || "";
    },
    [locale],
  );

  const speakReply = useCallback(
    (text: string, token: number) => {
      if (mute) {
        setPhase("idle");
        return;
      }
      setPhase("speaking");
      Speech.speak(text, {
        language: locale === "kk" ? "kk-KZ" : locale === "en" ? "en-US" : "ru-RU",
        onDone: () => {
          if (tokenRef.current !== token) return;
          setPhase("idle");
        },
        onStopped: () => {
          if (tokenRef.current !== token) return;
          setPhase("idle");
        },
      });
    },
    [locale, mute],
  );

  const sendCoach = useCallback(
    async (message: string, token: number) => {
      const text = message.trim();
      if (!text) return;
      setHeard(text);
      setHistory((prev) => [...prev, { role: "user", text }]);
      setPhase("processing");
      try {
        const data = await apiPost<{ reply?: string }>("/api/coach/chat", {
          message: text,
          spoken: true,
          history: history.slice(-8),
          learning: {
            grade: learning.profile?.grade,
            subjectId: learning.profile?.subjectId,
          },
        });
        if (tokenRef.current !== token) return;
        const reply = data.reply?.trim() || t("voiceCoach.fail");
        setHistory((prev) => [...prev, { role: "assistant", text: reply }]);
        speakReply(reply, token);
      } catch (err) {
        if (tokenRef.current !== token) return;
        setPhase("error");
        setHeard(humanError(err instanceof Error ? err.message : "", t("voiceCoach.fail")));
      }
    },
    [history, learning.profile?.grade, learning.profile?.subjectId, speakReply, t],
  );

  const runControl = useCallback(
    async (message: string, token: number) => {
      const text = message.trim();
      if (!text) return;
      setHeard(text);
      setPhase("processing");
      try {
        const data = await apiPost<{ command?: unknown }>("/api/voice/command", {
          command: text,
          pathname,
          locale,
          role: user?.role ?? "student",
          grade: learning.profile?.grade ?? null,
        });
        if (tokenRef.current !== token) return;
        const command = commandSpeak(data.command);
        const line = command.speak || t("voiceControl.unclear");
        setCommandLine(line);
        if (command.action === "navigate") {
          if (command.target === "learning") router.push("/learning");
          if (command.target === "clips") router.push("/learning/clips");
          if (command.target === "class") router.push("/learning/class");
          if (command.target === "home") router.push("/");
          if (command.target === "diagnostics") router.push("/learning/diagnostics");
        }
        speakReply(line, token);
      } catch (err) {
        if (tokenRef.current !== token) return;
        setPhase("error");
        setHeard(humanError(err instanceof Error ? err.message : "", t("voiceControl.unclear")));
      }
    },
    [learning.profile?.grade, locale, pathname, router, speakReply, t, user?.role],
  );

  const finishListen = useCallback(
    async (token: number) => {
      const uri = await stopRec(true);
      setPhase("processing");
      if (!uri) {
        setPhase("error");
        setHeard(t("voiceCoach.sttFail"));
        return;
      }
      try {
        const line = await transcribe(uri);
        if (tokenRef.current !== token) return;
        setTranscript(line);
        setHeard(line);
        if (!line) {
          setPhase("error");
          setHeard(t("voiceCoach.sttFail"));
          return;
        }
        if (tab === "coach") await sendCoach(line, token);
        else await runControl(line, token);
      } catch {
        if (tokenRef.current !== token) return;
        setPhase("error");
        setHeard(t("voiceCoach.sttFail"));
      }
    },
    [runControl, sendCoach, stopRec, t, tab, transcribe],
  );

  const startRec = useCallback(async () => {
    if (phase === "speaking" || phase === "processing") return;
    const token = bump();
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        setMicDenied(true);
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      recording.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording) return;
        const meter = status.metering ?? -80;
        if (meter > -35) {
          heardSoundRef.current = true;
          lastSoundRef.current = Date.now();
          setTranscript((prev) => prev || "…");
        }
      });
      recording.setProgressUpdateInterval(200);
      await recording.startAsync();
      recordingRef.current = recording;
      heardSoundRef.current = false;
      lastSoundRef.current = Date.now();
      setPhase("listening");
      setTranscript("");
      setMicDenied(false);
      silenceTimer.current = setInterval(() => {
        if (!heardSoundRef.current) return;
        if (Date.now() - lastSoundRef.current >= 1200) {
          void finishListen(token);
        }
      }, 200);
    } catch {
      setMicDenied(true);
    }
  }, [finishListen, phase]);

  const interrupt = () => {
    bump();
    stopSpeech();
    void stopRec(false);
    setPhase("idle");
    void startRec();
  };

  const switchTab = (next: Tab) => {
    bump();
    stopSpeech();
    void stopRec(false);
    setPhase("idle");
    setContinuous(false);
    setTab(next);
  };

  useEffect(
    () => () => {
      bump();
      stopSpeech();
      void stopRec(false);
    },
    [stopRec, stopSpeech],
  );

  const title = user?.role === "teacher" ? t("voiceCoach.teacherTitle") : t("voiceCoach.studentTitle");
  const stateLabel =
    phase === "listening"
      ? t("voiceDock.listening")
      : phase === "processing"
        ? t("voiceDock.processing")
        : phase === "speaking"
          ? t("voiceDock.speaking")
          : phase === "error"
            ? t("voiceDock.error")
            : t("voiceDock.idle");

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: 88 + insets.bottom }]}>
      {open ? (
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.head}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Pressable onPress={() => { bump(); stopSpeech(); void stopRec(false); setOpen(false); }} style={styles.close} accessibilityLabel={t("voiceCoach.close")}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <View style={styles.tabs}>
            <Pressable onPress={() => switchTab("coach")} style={[styles.tab, tab === "coach" && styles.tabOn]}>
              <Text style={[styles.tabText, tab === "coach" && styles.tabTextOn]}>{t("voiceDock.coach")}</Text>
            </Pressable>
            <Pressable onPress={() => switchTab("control")} style={[styles.tab, tab === "control" && styles.tabOn]}>
              <Text style={[styles.tabText, tab === "control" && styles.tabTextOn]}>{t("voiceDock.control")}</Text>
            </Pressable>
          </View>
          <View style={styles.stateRow}>
            {phase === "listening" ? <View style={styles.pulse} /> : null}
            {phase === "processing" ? <ActivityIndicator color={colors.primary} /> : null}
            {continuous ? <Text style={styles.rec}>{t("voiceDock.rec")}</Text> : null}
            <Text style={styles.state}>{stateLabel}</Text>
          </View>
          {transcript || heard ? <Text style={styles.heard}>{transcript || heard}</Text> : null}
          {tab === "control" && commandLine ? <Text style={styles.cmd}>{commandLine}</Text> : null}
          <ScrollView style={styles.history}>
            {tab === "coach" && history.length === 0 ? <Text style={styles.muted}>{t("voiceCoach.empty")}</Text> : null}
            {tab === "coach"
              ? history.map((turn, index) => (
                  <Text key={`${turn.role}-${index}`} style={turn.role === "user" ? styles.user : styles.bot}>
                    {turn.text}
                  </Text>
                ))
              : null}
          </ScrollView>
          {micDenied ? (
            <View style={styles.row}>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                placeholder={t("voiceDock.typePh")}
                style={styles.input}
              />
              <Pressable
                onPress={() => {
                  const token = bump();
                  const line = typed.trim();
                  setTyped("");
                  if (tab === "coach") void sendCoach(line, token);
                  else void runControl(line, token);
                }}
                style={styles.send}
              >
                <Text style={styles.sendText}>{t("voiceCoach.send")}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {phase === "speaking" ? (
                <Pressable onPress={interrupt} style={styles.stop}>
                  <Text style={styles.sendText}>{t("voiceDock.interrupt")}</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => (phase === "listening" ? void finishListen(tokenRef.current) : void startRec())}
                  style={[styles.mic, phase === "listening" && styles.micOn]}
                >
                  <Text style={styles.sendText}>{phase === "listening" ? t("voiceCoach.release") : t("voiceDock.idle")}</Text>
                </Pressable>
              )}
              {tab === "control" ? (
                <Pressable
                  onPress={() => {
                    setContinuous((v) => !v);
                    if (!continuous) void startRec();
                    else {
                      bump();
                      void stopRec(false);
                      setPhase("idle");
                    }
                  }}
                  style={continuous ? styles.stop : styles.secondary}
                >
                  <Text style={continuous ? styles.sendText : styles.secondaryText}>
                    {continuous ? t("voiceDock.stop") : t("voiceDock.continuous")}
                  </Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => setMute((v) => !v)} style={styles.secondary}>
                  <Text style={styles.secondaryText}>{mute ? t("voiceDock.unmute") : t("voiceDock.mute")}</Text>
                </Pressable>
              )}
              {phase === "error" ? (
                <Pressable onPress={() => void startRec()} style={styles.secondary}>
                  <Text style={styles.secondaryText}>{t("voiceDock.retry")}</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      ) : null}
      <Pressable onPress={() => setOpen((prev) => !prev)} style={styles.fab} accessibilityLabel={title}>
        <Text style={styles.fabText}>🎙</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", right: 16, alignItems: "flex-end", zIndex: 50, maxWidth: 340, width: "92%" },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  fabText: { fontSize: 22, color: "#fff" },
  sheet: {
    width: "100%",
    maxHeight: 440,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontWeight: "800", fontSize: 16, color: colors.ink, flex: 1 },
  close: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 28, color: colors.ink, fontWeight: "700" },
  tabs: { flexDirection: "row", gap: 8, marginTop: 4 },
  tab: { flex: 1, minHeight: tap, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#F1EFFF" },
  tabOn: { backgroundColor: colors.primary },
  tabText: { fontWeight: "800", color: colors.primary },
  tabTextOn: { color: "#fff" },
  stateRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  pulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#E75555" },
  rec: { color: "#E75555", fontWeight: "800" },
  state: { fontWeight: "700", color: colors.ink },
  heard: { marginTop: 6, fontWeight: "600", color: colors.ink },
  cmd: { marginTop: 4, fontWeight: "700", color: colors.primary },
  history: { maxHeight: 140, marginTop: 8 },
  muted: { color: "#64748b" },
  user: { alignSelf: "flex-end", backgroundColor: colors.primary, color: "#fff", padding: 8, borderRadius: 12, marginBottom: 6, overflow: "hidden" },
  bot: { alignSelf: "flex-start", backgroundColor: "#f8fafc", padding: 8, borderRadius: 12, marginBottom: 6, overflow: "hidden", color: colors.ink },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  input: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, paddingHorizontal: 8 },
  send: { minHeight: 44, paddingHorizontal: 12, justifyContent: "center", backgroundColor: colors.primary, borderRadius: 12 },
  sendText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  mic: { minHeight: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  micOn: { backgroundColor: "#E75555" },
  stop: { minHeight: 52, borderRadius: 24, backgroundColor: "#E75555", alignItems: "center", justifyContent: "center" },
  secondary: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center", justifyContent: "center" },
  secondaryText: { fontWeight: "700", color: colors.ink },
});
