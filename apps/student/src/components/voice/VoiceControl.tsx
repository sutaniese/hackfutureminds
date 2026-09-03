"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/components/shell/useAuth";
import { useSelectedRole } from "@/components/shell/useSelectedRole";
import { useLearning } from "@/components/learning/useLearning";
import { isLocale, type Locale } from "@/i18n/locales";
import { joinClassByCode } from "@/lib/learning/remote";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { saveLocalClassJoin } from "@/lib/learning/class-local";
import { isInviteCodeFormat, normalizeInviteCode } from "@/lib/learning/invite";
import { speakText, stopSpeaking } from "@/lib/speech";
import { ROLE_ENTRY_PATHS, type UserRole } from "@/lib/site-nav";
import { looksLikeHttpHtmlFailureMessage, readJsonResponse } from "@/lib/http-json";
import {
  commandPlainLanguage,
  parseVoiceControlCommand,
  resolveVoicePath,
  type VoiceControlCommand,
} from "@/lib/voice/control-command";
import { emitVoiceUi, screenDigest } from "@/lib/voice/bus";
import { canStartListening, phaseAfterInterrupt, type VoicePhase } from "@/lib/voice/machine";
import { useTapMic } from "@/lib/voice/use-tap-mic";

export function VoiceControl({ embedded = false, active = true }: { embedded?: boolean; active?: boolean }) {
  const { t, locale, setLocale } = useI18n();
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { user, logout } = useAuth();
  const { role, setRole } = useSelectedRole();
  const { profile } = useLearning();
  const [open, setOpen] = useState(embedded);
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [heard, setHeard] = useState("");
  const [parsed, setParsed] = useState("");
  const [error, setError] = useState("");
  const [typed, setTyped] = useState("");
  const [pendingLogout, setPendingLogout] = useState(false);
  const tokenRef = useRef(0);

  const bump = () => {
    tokenRef.current += 1;
    return tokenRef.current;
  };

  const runCommand = useCallback(
    async (command: VoiceControlCommand): Promise<"ok" | "error"> => {
      const line = commandPlainLanguage(command);
      setParsed(line);
      if (command.action === "noop") {
        speakText(line, locale);
        return "ok";
      }
      if (command.action === "logout") {
        if (!command.confirm && !pendingLogout) {
          setPendingLogout(true);
          setParsed(t("voiceControl.logoutAsk"));
          speakText(t("voiceControl.logoutAsk"), locale);
          return "ok";
        }
        setPendingLogout(false);
        speakText(command.speak || t("voiceControl.logoutOk"), locale);
        await logout();
        router.push("/");
        return "ok";
      }
      setPendingLogout(false);

      if (command.action === "language" && isLocale(command.locale)) {
        setLocale(command.locale as Locale);
        speakText(line, locale);
        return "ok";
      }

      if (command.action === "role") {
        const wanted = command.role as UserRole;
        if (user && user.role !== wanted) {
          setParsed(t("voiceControl.roleDenied"));
          speakText(t("voiceControl.roleDenied"), locale);
          return "ok";
        }
        if (!user) setRole(wanted);
        router.push(ROLE_ENTRY_PATHS[wanted]);
        speakText(line, locale);
        return "ok";
      }

      if (command.action === "back") {
        router.back();
        speakText(line, locale);
        return "ok";
      }

      if (command.action === "open_more") {
        emitVoiceUi({ type: "open_more" });
        const nav = document.querySelector("nav[role='navigation']");
        if (nav instanceof HTMLElement) nav.focus();
        speakText(line, locale);
        return "ok";
      }

      if (command.action === "read_screen") {
        speakText(line, locale);
        return "ok";
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
          speakText(line, locale);
          return "ok";
        } catch {
          setError(t("voiceControl.joinFail"));
          setPhase("error");
          return "error";
        }
      }

      if (command.action === "diagnostic") {
        if (command.verb === "start") {
          const subject = command.subjectId ? `?subject=${encodeURIComponent(command.subjectId)}` : "";
          router.push(`/learning/diagnostics${subject}`);
        }
        emitVoiceUi({ type: "diagnostic", verb: command.verb, subjectId: command.subjectId });
        speakText(line, locale);
        return "ok";
      }

      if (command.action === "clip") {
        if (command.verb === "open") {
          const q = command.topicQuery ? `?q=${encodeURIComponent(command.topicQuery)}` : "";
          router.push(user?.role === "teacher" ? "/hub/obuchenie" : `/learning/clips${q}`);
        }
        emitVoiceUi({ type: "clip", verb: command.verb, topicQuery: command.topicQuery });
        speakText(line, locale);
        return "ok";
      }

      if (command.action === "navigate") {
        const resolved = resolveVoicePath(command, {
          role,
          userRole: user?.role ?? role,
          grade: profile?.grade,
        });
        if (resolved.blocked) {
          setParsed(resolved.blocked);
          speakText(resolved.blocked, locale);
          return "ok";
        }
        if (resolved.path) router.push(resolved.path);
        speakText(line, locale);
      }
      return "ok";
    },
    [locale, logout, pendingLogout, profile?.grade, role, router, setLocale, setRole, t, user],
  );

  const submitTranscript = useCallback(
    async (transcript: string, token: number) => {
      const clean = transcript.trim();
      if (!clean) {
        setError(t("voiceCoach.sttFail"));
        setPhase("error");
        return;
      }
      setHeard(clean);
      setPhase("processing");
      setError("");
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
        if (tokenRef.current !== token) return;
        if ("error" in data && !("command" in data)) {
          throw new Error((data as { error: string }).error);
        }
        const command = parseVoiceControlCommand((data as { command?: unknown }).command);
        if (!command) {
          throw new Error("unparsed");
        }
        const result = await runCommand(command);
        if (tokenRef.current !== token) return;
        if (result === "ok") setPhase("idle");
      } catch (err) {
        if (tokenRef.current !== token) return;
        const raw = err instanceof Error ? err.message : "";
        setError(looksLikeHttpHtmlFailureMessage(raw) ? t("voiceControl.fail") : t("voiceControl.fail"));
        setPhase("error");
      }
    },
    [locale, pathname, profile?.grade, role, runCommand, t, user?.role],
  );

  const onAudio = useCallback(
    async (audio: Blob) => {
      const token = tokenRef.current;
      setPhase("processing");
      try {
        const form = new FormData();
        form.set("audio", audio, "voice-control.webm");
        form.set("locale", locale);
        const response = await fetch("/api/voice-transcribe", { method: "POST", body: form });
        const data = await readJsonResponse<{ transcript?: string; error?: string }>(response);
        if (tokenRef.current !== token) return;
        if ("error" in data && !("transcript" in data)) {
          throw new Error((data as { error: string }).error);
        }
        const line = "transcript" in data ? data.transcript?.trim() : "";
        await submitTranscript(line || "", token);
      } catch {
        if (tokenRef.current !== token) return;
        setError(t("voiceControl.fail"));
        setPhase("error");
      }
    },
    [locale, submitTranscript, t],
  );

  const mic = useTapMic({
    active: active && (embedded || open),
    captureWave: false,
    onAudio,
    onStopped: (kind) => {
      if (kind === "send") setPhase("processing");
    },
  });

  useEffect(() => {
    if (!active) {
      bump();
      stopSpeaking();
      mic.stop("discard");
      setPhase("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const toggleMic = () => {
    if (phase === "speaking") return;
    if (mic.listening) {
      mic.stop("send");
      setPhase("processing");
      return;
    }
    if (!canStartListening(phase) && phase !== "error") return;
    bump();
    setError("");
    void mic.start().then((ok) => setPhase(ok ? "listening" : "idle"));
  };

  const statusLabel =
    mic.listening || phase === "listening"
      ? t("voiceControl.listening")
      : phase === "processing"
        ? t("voiceControl.processing")
        : phase === "error"
          ? t("voiceDock.error")
          : heard
            ? t("voiceControl.ready")
            : t("voiceDock.idle");

  const typeFallback = mic.denied || !mic.supported;
  const shown = embedded || open;

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-2">
      {embedded ? null : (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[#0F766E] px-4 text-sm font-bold text-white shadow-lg"
          aria-expanded={open}
        >
          {t("voiceControl.toggle")}
        </button>
      )}
      {shown ? (
        <section
          className={`${embedded ? "w-full rounded-none border-0 p-3 shadow-none" : "w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-teal-200 bg-white/95 p-3 shadow-xl"}`}
          aria-live="polite"
          aria-label={t("voiceControl.toggle")}
        >
          <p className="text-sm font-black uppercase tracking-[0.12em] text-teal-800">{statusLabel}</p>
          {heard ? (
            <p className="mt-2 text-sm text-pathwise-muted">
              {t("voiceControl.heard")}: <span className="font-semibold text-pathwise-ink">{heard}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm font-semibold text-pathwise-ink">{t("voiceControl.hint")}</p>
          )}
          {parsed ? <p className="mt-1 text-sm font-bold text-[#0F766E]">{parsed}</p> : null}
          {error ? <p className="mt-1 text-sm font-semibold text-[#E75555]">{error}</p> : null}
          {typeFallback ? (
            <form
              className="mt-2 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const token = bump();
                void submitTranscript(typed, token);
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
                className="pw-input min-h-11 flex-1 px-3 text-sm"
                placeholder={t("voiceControl.typePh")}
              />
              <button type="submit" className="pw-btn-primary min-h-11 px-3 text-sm">
                {t("voiceControl.run")}
              </button>
            </form>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {phase === "speaking" ? (
                <button
                  type="button"
                  onClick={() => {
                    bump();
                    stopSpeaking();
                    setPhase(phaseAfterInterrupt());
                  }}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#E75555] text-sm font-bold text-white"
                >
                  {t("voiceDock.interrupt")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={phase === "processing"}
                  className={`inline-flex min-h-11 w-full items-center justify-center rounded-full text-sm font-bold text-white ${
                    mic.listening ? "bg-[#E75555]" : "bg-[#0F766E]"
                  } disabled:opacity-60`}
                >
                  {mic.listening ? t("voiceCoach.stopSend") : t("voiceControl.tap")}
                </button>
              )}
              {phase === "error" ? (
                <button
                  type="button"
                  onClick={toggleMic}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-200 text-sm font-bold"
                >
                  {t("voiceDock.retry")}
                </button>
              ) : null}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
