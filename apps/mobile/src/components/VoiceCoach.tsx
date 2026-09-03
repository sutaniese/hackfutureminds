import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
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
import { saveLocalClassJoin } from "../lib/learning/class-local";
import { isInviteCodeFormat, normalizeInviteCode } from "../lib/learning/invite";
import { isLocale } from "../i18n/locales";
import { colors, tap } from "../lib/theme";
import {
  meteringToLevel,
  pushMeterSample,
  shouldStopOnSilence,
  VOICE_SPEECH_DB,
  waveDisplay,
} from "../lib/voice-meter";
import { commandPlainLanguage, resolveVoicePath, roleEntry, type VoiceCommand } from "../lib/voice-nav";
import type { UserRole } from "../lib/site-nav";

type Tab = "coach" | "control";
type Phase = "idle" | "listening" | "processing" | "speaking" | "error";
type Turn = { role: "user" | "assistant"; text: string };

function humanError(raw: string, fallback: string): string {
  if (/json|groq|401|api key|html|<!doctype/i.test(raw)) return fallback;
  return raw.slice(0, 160) || fallback;
}

function SoundWaves({
  levels,
  mode,
  label,
}: {
  levels: number[];
  mode: ReturnType<typeof waveDisplay>;
  label: string;
}) {
  if (mode === "off") return null;
  if (mode === "static") {
    return (
      <View style={styles.staticListen} accessibilityRole="text">
        <Text style={styles.staticListenText}>{label}</Text>
      </View>
    );
  }
  const bars = levels.length ? levels : Array.from({ length: 24 }, () => 0.08);
  const idle = mode === "idle";
  return (
    <View style={[styles.waveRow, idle && { opacity: 0.35 }]} accessibilityElementsHidden>
      {bars.map((level, index) => (
        <View
          key={index}
          style={[
            styles.waveBar,
            {
              height: Math.max(4, (idle ? 0.08 : level) * 44),
              backgroundColor: idle ? "#94A3B8" : colors.primary,
              opacity: mode === "frozen" ? 0.7 : 1,
            },
          ]}
        />
      ))}
    </View>
  );
}

export function VoiceCoach() {
  const { t, locale, setLocale } = useI18n();
  const { user, logout } = useAuth();
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
  const [commandLine, setCommandLine] = useState("");
  const [error, setError] = useState("");
  const [pendingLogout, setPendingLogout] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: 24 }, () => 0.08));
  const [reduced, setReduced] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const tokenRef = useRef(0);
  const lastSoundRef = useRef(0);
  const heardSoundRef = useRef(false);
  const silenceTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const frozenRef = useRef(false);

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
    frozenRef.current = true;
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
      if (json.error && !json.transcript) throw new Error(json.error);
      return json.transcript?.trim() || "";
    },
    [locale],
  );

  const speakReply = useCallback(
    (text: string, token: number) => {
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
    [locale],
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
        setError(humanError(err instanceof Error ? err.message : "", t("voiceCoach.fail")));
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
      setError("");
      try {
        const data = await apiPost<{ command?: VoiceCommand; error?: string }>("/api/voice/command", {
          command: text,
          pathname,
          locale,
          role: user?.role ?? "student",
          grade: learning.profile?.grade ?? null,
        });
        if (tokenRef.current !== token) return;
        if (data.error && !data.command) throw new Error(data.error);
        const command = data.command ?? { action: "noop", speak: t("voiceControl.unclear") };
        const line = commandPlainLanguage(command) || t("voiceControl.unclear");
        setCommandLine(line);

        if (command.action === "logout") {
          if (!command.confirm && !pendingLogout) {
            setPendingLogout(true);
            setCommandLine(t("voiceControl.logoutAsk"));
            speakReply(t("voiceControl.logoutAsk"), token);
            return;
          }
          setPendingLogout(false);
          speakReply(command.speak || t("voiceControl.logoutOk"), token);
          await logout();
          router.push("/");
          return;
        }
        setPendingLogout(false);

        if (command.action === "language" && command.locale && isLocale(command.locale)) {
          setLocale(command.locale);
          speakReply(line, token);
          return;
        }
        if (command.action === "role" && command.role) {
          const wanted = command.role as UserRole;
          if (user && user.role !== wanted) {
            setCommandLine(t("voiceControl.roleDenied"));
            speakReply(t("voiceControl.roleDenied"), token);
            return;
          }
          router.push(roleEntry(wanted));
          speakReply(line, token);
          return;
        }
        if (command.action === "back") {
          router.back();
          speakReply(line, token);
          return;
        }
        if (command.action === "join_class" && command.inviteCode) {
          const invite = normalizeInviteCode(command.inviteCode);
          try {
            const joined = await apiPost<{ class: { id: string; name: string; inviteCode: string } }>("/api/classes/join", {
              inviteCode: invite,
            });
            saveLocalClassJoin({
              inviteCode: joined.class.inviteCode || invite,
              name: joined.class.name,
              classId: joined.class.id,
              localOnly: false,
            });
          } catch {
            saveLocalClassJoin({
              inviteCode: invite,
              name: isInviteCodeFormat(invite) ? invite : invite,
              localOnly: true,
            });
          }
          router.push("/learning/class");
          speakReply(line, token);
          return;
        }
        if (command.action === "diagnostic" && command.verb === "start") {
          const subject = command.subjectId ? `?subject=${encodeURIComponent(command.subjectId)}` : "";
          router.push(`/learning/diagnostics${subject}` as never);
          speakReply(line, token);
          return;
        }
        if (command.action === "clip" && command.verb === "open") {
          const q = command.topicQuery ? `?q=${encodeURIComponent(command.topicQuery)}` : "";
          router.push((user?.role === "teacher" ? "/hub/obuchenie" : `/learning/clips${q}`) as never);
          speakReply(line, token);
          return;
        }
        if (command.action === "navigate") {
          const resolved = resolveVoicePath(command, {
            role: user?.role ?? "student",
            userRole: user?.role ?? "student",
            grade: learning.profile?.grade,
          });
          if (resolved.blocked) {
            setCommandLine(resolved.blocked);
            speakReply(resolved.blocked, token);
            return;
          }
          if (resolved.path) router.push(resolved.path as never);
        }
        speakReply(line, token);
      } catch (err) {
        if (tokenRef.current !== token) return;
        setPhase("error");
        setError(humanError(err instanceof Error ? err.message : "", t("voiceControl.fail")));
      }
    },
    [learning.profile?.grade, locale, logout, pathname, pendingLogout, router, setLocale, speakReply, t, user],
  );

  const finishListen = useCallback(
    async (token: number) => {
      const uri = await stopRec(true);
      setPhase("processing");
      if (!uri) {
        setPhase("error");
        setError(t("voiceCoach.sttFail"));
        return;
      }
      try {
        const line = await transcribe(uri);
        if (tokenRef.current !== token) return;
        setTranscript(line);
        setHeard(line);
        if (!line) {
          setPhase("error");
          setError(t("voiceCoach.sttFail"));
          return;
        }
        if (tab === "coach") await sendCoach(line, token);
        else await runControl(line, token);
      } catch (err) {
        if (tokenRef.current !== token) return;
        setPhase("error");
        setError(humanError(err instanceof Error ? err.message : "", t("voiceCoach.sttFail")));
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
      frozenRef.current = false;
      setLevels(Array.from({ length: 24 }, () => 0.08));
      recording.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording || frozenRef.current) return;
        const meter = status.metering ?? -80;
        const level = meteringToLevel(meter);
        if (tab === "coach") {
          setLevels((prev) => pushMeterSample(prev, Math.max(0.08, level)));
        }
        if (meter > VOICE_SPEECH_DB) {
          heardSoundRef.current = true;
          lastSoundRef.current = Date.now();
        }
      });
      recording.setProgressUpdateInterval(80);
      await recording.startAsync();
      recordingRef.current = recording;
      heardSoundRef.current = false;
      lastSoundRef.current = Date.now();
      setPhase("listening");
      setTranscript("");
      setError("");
      setMicDenied(false);
      silenceTimer.current = setInterval(() => {
        if (
          shouldStopOnSilence({
            heardSpeech: heardSoundRef.current,
            lastLoudAt: lastSoundRef.current,
            now: Date.now(),
          })
        ) {
          void finishListen(token);
        }
      }, 200);
    } catch {
      setMicDenied(true);
    }
  }, [finishListen, phase, tab]);

  const interrupt = () => {
    bump();
    stopSpeech();
    void stopRec(false);
    setPhase("idle");
  };

  const switchTab = (next: Tab) => {
    bump();
    stopSpeech();
    void stopRec(false);
    setPhase("idle");
    setError("");
    setCommandLine("");
    setTab(next);
  };

  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    return () => sub.remove();
  }, []);

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
        ? t("voiceControl.processing")
        : phase === "speaking"
          ? t("voiceDock.speaking")
          : phase === "error"
            ? t("voiceDock.error")
            : heard && tab === "control"
              ? t("voiceControl.ready")
              : t("voiceDock.idle");
  const waveMode = waveDisplay(phase, reduced, tab);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: 88 + insets.bottom }]}>
      {open ? (
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.head}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Pressable
              onPress={() => {
                bump();
                stopSpeech();
                void stopRec(false);
                setOpen(false);
              }}
              style={styles.close}
              accessibilityLabel={t("voiceCoach.close")}
            >
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
            {phase === "processing" ? <ActivityIndicator color={colors.primary} /> : null}
            <Text style={styles.state}>{stateLabel}</Text>
          </View>
          {tab === "coach" ? <SoundWaves levels={levels} mode={waveMode} label={t("voiceDock.listening")} /> : null}
          {transcript || heard ? <Text style={styles.heard}>{transcript || heard}</Text> : null}
          {tab === "control" && commandLine ? <Text style={styles.cmd}>{commandLine}</Text> : null}
          {error ? <Text style={styles.err}>{error}</Text> : null}
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
              ) : tab === "coach" ? (
                <Pressable
                  onPress={() => (phase === "listening" ? void finishListen(tokenRef.current) : void startRec())}
                  disabled={phase === "processing"}
                  style={[styles.micLarge, phase === "listening" && styles.micOn]}
                  accessibilityLabel={phase === "listening" ? t("voiceCoach.stopSend") : t("voiceCoach.tap")}
                >
                  <Text style={styles.micGlyph}>🎙</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => (phase === "listening" ? void finishListen(tokenRef.current) : void startRec())}
                  disabled={phase === "processing"}
                  style={[styles.mic, phase === "listening" && styles.micOn]}
                >
                  <Text style={styles.sendText}>
                    {phase === "listening" ? t("voiceCoach.stopSend") : t("voiceControl.tap")}
                  </Text>
                </Pressable>
              )}
              {tab === "coach" && phase !== "speaking" ? (
                <Text style={styles.hint}>
                  {phase === "listening" ? t("voiceCoach.stopSend") : t("voiceCoach.tap")}
                </Text>
              ) : null}
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
    maxHeight: 480,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontWeight: "800", fontSize: 16, color: colors.ink, flex: 1 },
  close: { width: tap, height: tap, alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 28, color: colors.ink, fontWeight: "700" },
  tabs: { flexDirection: "row", gap: 8, marginTop: 4 },
  tab: { flex: 1, minHeight: tap, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#F1EFFF" },
  tabOn: { backgroundColor: colors.primary },
  tabText: { fontWeight: "800", color: colors.primary },
  tabTextOn: { color: "#fff" },
  stateRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  state: { fontWeight: "700", color: colors.ink },
  heard: { marginTop: 6, fontWeight: "600", color: colors.ink },
  cmd: { marginTop: 4, fontWeight: "700", color: colors.primary },
  err: { marginTop: 4, fontWeight: "700", color: "#E75555" },
  history: { maxHeight: 140, marginTop: 8 },
  muted: { color: "#64748b" },
  user: { alignSelf: "flex-end", backgroundColor: colors.primary, color: "#fff", padding: 8, borderRadius: 12, marginBottom: 6, overflow: "hidden" },
  bot: { alignSelf: "flex-start", backgroundColor: "#f8fafc", padding: 8, borderRadius: 12, marginBottom: 6, overflow: "hidden", color: colors.ink },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  input: { flex: 1, minHeight: tap, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, paddingHorizontal: 8 },
  send: { minHeight: tap, minWidth: tap, paddingHorizontal: 12, justifyContent: "center", backgroundColor: colors.primary, borderRadius: 12 },
  sendText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  mic: { minHeight: tap, borderRadius: 24, backgroundColor: "#0F766E", alignItems: "center", justifyContent: "center" },
  micLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  micGlyph: { fontSize: 32 },
  micOn: { backgroundColor: "#E75555" },
  stop: { minHeight: tap, borderRadius: 24, backgroundColor: "#E75555", alignItems: "center", justifyContent: "center" },
  secondary: { minHeight: tap, borderRadius: 22, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center", justifyContent: "center" },
  secondaryText: { fontWeight: "700", color: colors.ink },
  hint: { textAlign: "center", fontWeight: "600", color: "#64748b", fontSize: 12 },
  waveRow: { height: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 2, marginTop: 8 },
  waveBar: { flex: 1, borderRadius: 2 },
  staticListen: {
    minHeight: tap,
    marginTop: 8,
    borderRadius: 22,
    backgroundColor: "#F1EFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  staticListenText: { fontWeight: "800", color: colors.primary },
});
