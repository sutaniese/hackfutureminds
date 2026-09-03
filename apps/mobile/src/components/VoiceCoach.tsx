import { useCallback, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import { useI18n } from "../context/I18nContext";
import { useAuth } from "../context/AuthContext";
import { useLearning } from "../context/LearningContext";
import { apiPost } from "../lib/api";
import { getAccessToken } from "../lib/auth";
import { getApiUrl } from "../lib/env";

type Turn = { role: "user" | "assistant"; text: string };

export function VoiceCoach() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const learning = useLearning();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [history, setHistory] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [listening, setListening] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const send = useCallback(
    async (message: string) => {
      const text = message.trim();
      if (!text || busy) return;
      setHistory((prev) => [...prev, { role: "user", text }]);
      setBusy(true);
      try {
        const data = await apiPost<{ reply?: string }>("/api/coach/chat", {
          message: text,
          spoken: true,
          history: history.slice(-8),
          learning: {
            grade: learning.profile?.grade,
            subjectId: learning.profile?.subjectId,
            weakTopics: Object.entries(learning.state.topics)
              .filter(([, row]) => row.attempts > 0 && row.correct / Math.max(1, row.attempts) < 0.5)
              .map(([id]) => id)
              .slice(0, 6),
          },
        });
        const reply = data.reply?.trim() || t("voiceCoach.fail");
        setHistory((prev) => [...prev, { role: "assistant", text: reply }]);
        Speech.speak(reply, { language: locale === "kk" ? "kk-KZ" : locale === "en" ? "en-US" : "ru-RU" });
      } catch {
        setHistory((prev) => [...prev, { role: "assistant", text: t("voiceCoach.fail") }]);
      } finally {
        setBusy(false);
      }
    },
    [busy, history, learning.profile?.grade, learning.profile?.subjectId, learning.state.topics, locale, t],
  );

  const stopRec = useCallback(async () => {
    const rec = recordingRef.current;
    recordingRef.current = null;
    setListening(false);
    if (!rec) return;
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (!uri) return;
      const form = new FormData();
      form.append("audio", { uri, name: "coach.m4a", type: "audio/m4a" } as unknown as Blob);
      form.append("locale", locale);
      const headers: Record<string, string> = { Accept: "application/json" };
      const token = getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`${getApiUrl()}/api/voice-transcribe`, { method: "POST", headers, body: form });
      const json = (await response.json()) as { transcript?: string };
      if (json.transcript?.trim()) await send(json.transcript.trim());
      else setHistory((prev) => [...prev, { role: "assistant", text: t("voiceCoach.sttFail") }]);
    } catch {
      setMicDenied(true);
    }
  }, [locale, send, t]);

  const startRec = useCallback(async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        setMicDenied(true);
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setListening(true);
      setMicDenied(false);
    } catch {
      setMicDenied(true);
    }
  }, []);

  const title = user?.role === "teacher" ? t("voiceCoach.teacherTitle") : t("voiceCoach.studentTitle");

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      {open ? (
        <View style={styles.panel}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={styles.history}>
            {history.length === 0 ? <Text style={styles.muted}>{t("voiceCoach.empty")}</Text> : null}
            {history.map((turn, index) => (
              <Text key={`${turn.role}-${index}`} style={turn.role === "user" ? styles.user : styles.bot}>
                {turn.text}
              </Text>
            ))}
          </ScrollView>
          {micDenied ? (
            <View style={styles.row}>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                placeholder={t("voiceCoach.typePh")}
                style={styles.input}
              />
              <Pressable
                onPress={() => {
                  void send(typed);
                  setTyped("");
                }}
                style={styles.send}
              >
                <Text style={styles.sendText}>{t("voiceCoach.send")}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPressIn={() => void startRec()}
              onPressOut={() => void stopRec()}
              style={[styles.mic, listening && styles.micOn]}
            >
              <Text style={styles.sendText}>{listening ? t("voiceCoach.release") : t("voiceCoach.hold")}</Text>
            </Pressable>
          )}
          <Pressable onPress={() => setOpen(false)} style={styles.close}>
            <Text>{t("voiceCoach.close")}</Text>
          </Pressable>
        </View>
      ) : null}
      <Pressable onPress={() => setOpen((prev) => !prev)} style={styles.fab} accessibilityLabel={title}>
        <Text style={styles.fabText}>🎙</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", right: 16, bottom: 88, alignItems: "flex-end", zIndex: 50 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6C63FF",
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { fontSize: 22, color: "#fff" },
  panel: {
    width: 280,
    maxHeight: 360,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  title: { fontWeight: "800", marginBottom: 8 },
  history: { maxHeight: 180 },
  muted: { color: "#64748b" },
  user: { alignSelf: "flex-end", backgroundColor: "#6C63FF", color: "#fff", padding: 8, borderRadius: 12, marginBottom: 6 },
  bot: { alignSelf: "flex-start", backgroundColor: "#f8fafc", padding: 8, borderRadius: 12, marginBottom: 6 },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  input: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, paddingHorizontal: 8 },
  send: { minHeight: 44, paddingHorizontal: 12, justifyContent: "center", backgroundColor: "#6C63FF", borderRadius: 12 },
  sendText: { color: "#fff", fontWeight: "700" },
  mic: { minHeight: 48, marginTop: 8, borderRadius: 24, backgroundColor: "#6C63FF", alignItems: "center", justifyContent: "center" },
  micOn: { backgroundColor: "#E75555" },
  close: { marginTop: 8, minHeight: 44, alignItems: "center", justifyContent: "center" },
});
