"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/components/shell/useAuth";
import { useSelectedRole } from "@/components/shell/useSelectedRole";
import { useLearning } from "@/components/learning/useLearning";
import { isLocale, type Locale } from "@/i18n/locales";
import { LS_VOICE } from "@/lib/pw-storage";
import { joinClassByCode } from "@/lib/learning/remote";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { saveLocalClassJoin } from "@/lib/learning/class-local";
import { isInviteCodeFormat, normalizeInviteCode } from "@/lib/learning/invite";
import { speakText, stopSpeaking } from "@/lib/speech";
import { ROLE_ENTRY_PATHS, type UserRole } from "@/lib/site-nav";
import { looksLikeHttpHtmlFailureMessage, readJsonResponse } from "@/lib/http-json";
import {
  parseVoiceControlCommand,
  resolveVoicePath,
  type VoiceControlCommand,
} from "@/lib/voice/control-command";
import { emitVoiceUi, LS_VOICE_CONTROL, screenDigest, VOICE_CONTROL_TOGGLE } from "@/lib/voice/bus";

type Status = "off" | "idle" | "listening" | "processing";

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function VoiceControl() {
  const { t, locale, setLocale } = useI18n();
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { user, logout } = useAuth();
  const { role, setRole } = useSelectedRole();
  const { profile } = useLearning();
  const [on, setOn] = useState(false);
  const [status, setStatus] = useState<Status>("off");
  const [last, setLast] = useState("");
  const [typed, setTyped] = useState("");
  const [micDenied, setMicDenied] = useState(false);
  const [pendingLogout, setPendingLogout] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const loopRef = useRef(false);
  const busyRef = useRef(false);

  const supported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return typeof navigator.mediaDevices?.getUserMedia === "function" && typeof window.MediaRecorder !== "undefined";
  }, []);

  const persist = useCallback((next: boolean) => {
    setOn(next);
    setStatus(next ? "idle" : "off");
    try {
      if (next) {
        localStorage.setItem(LS_VOICE_CONTROL, "1");
        localStorage.setItem(LS_VOICE, "1");
      } else {
        localStorage.removeItem(LS_VOICE_CONTROL);
        localStorage.removeItem(LS_VOICE);
      }
      window.dispatchEvent(new Event("pathwise:voice-toggle"));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      const enabled =
        localStorage.getItem(LS_VOICE_CONTROL) === "1" || localStorage.getItem(LS_VOICE) === "1";
      setOn(enabled);
      setStatus(enabled ? "idle" : "off");
    } catch {
      /* ignore */
    }
    const sync = () => {
      try {
        const enabled =
          localStorage.getItem(LS_VOICE_CONTROL) === "1" || localStorage.getItem(LS_VOICE) === "1";
        setOn(enabled);
        setStatus((prev) => (enabled ? (prev === "off" ? "idle" : prev) : "off"));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", sync);
    window.addEventListener("pathwise:voice-toggle", sync);
    window.addEventListener(VOICE_CONTROL_TOGGLE, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("pathwise:voice-toggle", sync);
      window.removeEventListener(VOICE_CONTROL_TOGGLE, sync);
    };
  }, []);

  const speak = useCallback(
    (line: string) => {
      setLast(line);
      speakText(line, locale);
    },
    [locale],
  );

  const runCommand = useCallback(
    async (command: VoiceControlCommand) => {
      if (command.action === "noop") {
        speak(command.speak);
        return;
      }
      if (command.action === "logout") {
        if (!command.confirm && !pendingLogout) {
          setPendingLogout(true);
          speak(t("voiceControl.logoutAsk"));
          return;
        }
        setPendingLogout(false);
        speak(command.speak || t("voiceControl.logoutOk"));
        await logout();
        router.push("/");
        return;
      }
      setPendingLogout(false);

      if (command.action === "language" && isLocale(command.locale)) {
        setLocale(command.locale as Locale);
        speak(command.speak);
        return;
      }

      if (command.action === "role") {
        const wanted = command.role as UserRole;
        if (user && user.role !== wanted) {
          speak(t("voiceControl.roleDenied"));
          return;
        }
        if (!user) setRole(wanted);
        router.push(ROLE_ENTRY_PATHS[wanted]);
        speak(command.speak);
        return;
      }

      if (command.action === "back") {
        router.back();
        speak(command.speak);
        return;
      }

      if (command.action === "open_more") {
        emitVoiceUi({ type: "open_more" });
        const nav = document.querySelector("nav[role='navigation']");
        if (nav instanceof HTMLElement) nav.focus();
        speak(command.speak);
        return;
      }

      if (command.action === "read_screen") {
        speak(command.speak);
        return;
      }

      if (command.action === "join_class") {
        const invite = normalizeInviteCode(command.inviteCode);
        emitVoiceUi({ type: "join_class", inviteCode: invite });
        try {
          if (!isSupabaseConfigured()) {
            saveLocalClassJoin({
              inviteCode: invite,
              name: isInviteCodeFormat(invite) ? invite : invite,
              localOnly: true,
            });
          } else {
            const joined = await joinClassByCode(invite);
            saveLocalClassJoin({
              inviteCode: joined.inviteCode || invite,
              name: joined.name,
              classId: joined.classId,
              localOnly: false,
            });
          }
          speak(command.speak);
        } catch {
          speak(t("voiceControl.joinFail"));
        }
        return;
      }

      if (command.action === "diagnostic") {
        if (command.verb === "start") {
          const subject = command.subjectId ? `?subject=${encodeURIComponent(command.subjectId)}` : "";
          router.push(`/learning/diagnostics${subject}`);
        }
        emitVoiceUi({ type: "diagnostic", verb: command.verb, subjectId: command.subjectId });
        speak(command.speak);
        return;
      }

      if (command.action === "clip") {
        if (command.verb === "open") {
          const q = command.topicQuery ? `?q=${encodeURIComponent(command.topicQuery)}` : "";
          router.push(user?.role === "teacher" ? "/hub/obuchenie" : `/learning/clips${q}`);
        }
        emitVoiceUi({ type: "clip", verb: command.verb, topicQuery: command.topicQuery });
        speak(command.speak);
        return;
      }

      if (command.action === "navigate") {
        const resolved = resolveVoicePath(command, {
          role,
          userRole: user?.role ?? role,
          grade: profile?.grade,
        });
        if (resolved.blocked) {
          speak(resolved.blocked);
          return;
        }
        if (resolved.path) router.push(resolved.path);
        speak(command.speak);
      }
    },
    [logout, pendingLogout, profile?.grade, role, router, setLocale, setRole, speak, t, user],
  );

  const submitTranscript = useCallback(
    async (transcript: string) => {
      const clean = transcript.trim();
      if (!clean || busyRef.current) return;
      busyRef.current = true;
      setStatus("processing");
      try {
        const response = await fetch("/api/voice/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            command: clean,
            pathname,
            locale,
            role: user?.role ?? role,
            grade: profile?.grade ?? null,
            screenText: screenDigest(),
          }),
        });
        const data = await readJsonResponse<{ command?: VoiceControlCommand; error?: string }>(response);
        if ("error" in data && !("command" in data)) {
          throw new Error((data as { error: string }).error);
        }
        const command = parseVoiceControlCommand((data as { command?: unknown }).command);
        await runCommand(command ?? { action: "noop", speak: t("voiceControl.unclear") });
      } catch (error) {
        const raw = error instanceof Error ? error.message : "";
        const line = looksLikeHttpHtmlFailureMessage(raw) ? t("voiceControl.unclear") : t("voiceControl.unclear");
        speak(line);
      } finally {
        busyRef.current = false;
        if (loopRef.current) setStatus("listening");
        else setStatus(on ? "idle" : "off");
      }
    },
    [locale, on, pathname, profile?.grade, role, runCommand, speak, t, user?.role],
  );

  const stopMic = useCallback(() => {
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startChunk = useCallback(async () => {
    if (!supported || !loopRef.current) return;
    try {
      const stream = streamRef.current ?? (await navigator.mediaDevices.getUserMedia({ audio: true }));
      streamRef.current = stream;
      setMicDenied(false);
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (audio.size > 1200 && loopRef.current) {
          const form = new FormData();
          form.set("audio", audio, "voice-control.webm");
          form.set("locale", locale);
          void fetch("/api/voice-transcribe", { method: "POST", body: form })
            .then((res) => readJsonResponse<{ transcript?: string }>(res))
            .then((data) => {
              const line = "transcript" in data ? data.transcript?.trim() : "";
              if (line) void submitTranscript(line);
            })
            .finally(() => {
              if (loopRef.current) window.setTimeout(() => void startChunk(), 250);
            });
        } else if (loopRef.current) {
          window.setTimeout(() => void startChunk(), 250);
        }
      };
      recorder.start();
      setStatus("listening");
      window.setTimeout(() => {
        if (recorderRef.current === recorder && recorder.state === "recording") recorder.stop();
      }, 4500);
    } catch {
      setMicDenied(true);
      loopRef.current = false;
      setStatus("idle");
      speak(t("voiceControl.micDenied"));
    }
  }, [locale, speak, submitTranscript, supported, t]);

  const enable = useCallback(() => {
    persist(true);
    loopRef.current = true;
    if (supported && !micDenied) void startChunk();
    else setStatus("idle");
  }, [micDenied, persist, startChunk, supported]);

  const disable = useCallback(() => {
    loopRef.current = false;
    stopMic();
    stopSpeaking();
    persist(false);
  }, [persist, stopMic]);

  useEffect(() => {
    return () => {
      loopRef.current = false;
      stopMic();
    };
  }, [stopMic]);

  const pulse = on && status === "listening" && !reducedMotion();

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => (on ? disable() : enable())}
        aria-pressed={on}
        className={`inline-flex min-h-12 min-w-[11rem] items-center justify-center rounded-full px-4 text-sm font-bold shadow-lg transition ${
          on ? "bg-[#0F766E] text-white" : "border border-slate-200 bg-white text-pathwise-ink"
        } ${pulse ? "animate-pulse" : ""}`}
      >
        {t("voiceControl.toggle")}
      </button>
      {on ? (
        <section
          className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-teal-200 bg-white/95 p-3 shadow-xl"
          aria-live="polite"
          aria-label={t("voiceControl.toggle")}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-teal-800">
            {status === "listening"
              ? t("voiceControl.listening")
              : status === "processing"
                ? t("voiceControl.processing")
                : t("voiceControl.idle")}
          </p>
          <p className="mt-1 text-sm font-semibold text-pathwise-ink">{last || t("voiceControl.hint")}</p>
          {micDenied || !supported ? (
            <form
              className="mt-2 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void submitTranscript(typed);
                setTyped("");
              }}
            >
              <label className="sr-only" htmlFor="voice-control-type">
                {t("voiceControl.type")}
              </label>
              <input
                id="voice-control-type"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                className="pw-input min-h-12 flex-1 px-3 text-sm"
                placeholder={t("voiceControl.typePh")}
              />
              <button type="submit" className="pw-btn-primary min-h-12 px-3 text-sm">
                {t("voiceControl.run")}
              </button>
            </form>
          ) : null}
          <button
            type="button"
            onClick={disable}
            className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-bold"
          >
            {t("voiceControl.off")}
          </button>
        </section>
      ) : null}
    </div>
  );
}
