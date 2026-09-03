"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { joinClassByCode } from "@/lib/learning/remote";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { saveLocalClassJoin } from "@/lib/learning/class-local";
import { isInviteCodeFormat, normalizeInviteCode } from "@/lib/learning/invite";
import { ContentCard } from "@/components/ui/PageHero";
import { useI18n } from "@/i18n/I18nProvider";
import { humanClientError } from "@/lib/client-error";
import { VOICE_CONTROL_EVENT, type VoiceUiEvent } from "@/lib/voice/bus";

export function ClassJoinCard({
  currentCode,
  compact = false,
  onJoined,
}: {
  currentCode?: string | null;
  compact?: boolean;
  onJoined?: (result: { name: string; inviteCode: string; classId: string; localOnly: boolean }) => void;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();

  async function joinWith(raw: string) {
    setError(null);
    setMessage(null);
    const invite = normalizeInviteCode(raw);
    if (!invite) return;
    setBusy(true);
    try {
      if (!configured) {
        const saved = saveLocalClassJoin({
          inviteCode: invite,
          name: isInviteCodeFormat(invite) ? invite : invite,
          localOnly: true,
        });
        setMessage(t("class.localSaved", { code: saved.inviteCode }));
        setCode("");
        onJoined?.({
          name: saved.name,
          inviteCode: saved.inviteCode,
          classId: saved.classId,
          localOnly: true,
        });
        return;
      }
      const joined = await joinClassByCode(invite);
      saveLocalClassJoin({
        inviteCode: joined.inviteCode || invite,
        name: joined.name,
        classId: joined.classId,
        localOnly: false,
      });
      setMessage(t("class.joined", { name: joined.name, code: joined.inviteCode || invite }));
      setCode("");
      onJoined?.({
        name: joined.name,
        inviteCode: joined.inviteCode || invite,
        classId: joined.classId,
        localOnly: false,
      });
    } catch (err) {
      setError(humanClientError(err, t("class.joinFail")));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const onVoice = (event: Event) => {
      const detail = (event as CustomEvent<VoiceUiEvent>).detail;
      if (detail?.type === "join_class" && detail.inviteCode) {
        setCode(detail.inviteCode);
        void joinWith(detail.inviteCode);
      }
    };
    window.addEventListener(VOICE_CONTROL_EVENT, onVoice);
    return () => window.removeEventListener(VOICE_CONTROL_EVENT, onVoice);
    // joinWith is stable enough for this card lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, t]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await joinWith(code);
  }

  const form = (
    <form onSubmit={onSubmit} className={compact ? "mt-3 flex flex-wrap gap-2" : "mt-4 flex flex-wrap gap-2"}>
      <input
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder={t("class.placeholder")}
        className="pw-input min-h-12 flex-1 px-4 text-sm font-bold tracking-widest"
        aria-label={t("class.aria")}
        autoCapitalize="characters"
        autoComplete="off"
      />
      <button type="submit" disabled={busy || !code.trim()} className="pw-btn-primary text-sm disabled:opacity-50">
        {busy ? t("class.joining") : t("class.join")}
      </button>
    </form>
  );

  if (compact) {
    return (
      <ContentCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black tracking-tight text-pathwise-ink">{t("class.codeTitle")}</h3>
            <p className="mt-1 text-sm text-pathwise-muted">
              {currentCode ? t("class.teacherClass") : t("class.codeHint")}
            </p>
          </div>
          <Link href="/learning/class" className="pw-btn-secondary shrink-0 text-sm no-underline">
            {t("class.openPage")}
          </Link>
        </div>
        {currentCode ? (
          <p className="mt-3 font-mono text-lg font-black tracking-widest text-[#554dd6]">{currentCode}</p>
        ) : null}
        {form}
        {!configured ? <p className="mt-2 text-xs font-semibold text-pathwise-muted">{t("class.needsServer")}</p> : null}
        {message ? <p className="mt-2 text-sm font-semibold text-emerald-600">{message}</p> : null}
        {error ? <p className="mt-2 text-sm font-semibold text-[#E75555]">{error}</p> : null}
      </ContentCard>
    );
  }

  return (
    <ContentCard>
      <h3 className="text-lg font-black tracking-tight text-pathwise-ink">
        {currentCode ? t("class.teacherClass") : t("class.codeTitle")}
      </h3>
      <p className="mt-1 text-sm text-pathwise-muted">{t("class.codeHint")}</p>
      {currentCode ? (
        <p className="mt-3 font-mono text-lg font-black tracking-widest text-[#554dd6]">{currentCode}</p>
      ) : null}
      {form}
      {!configured ? <p className="mt-2 text-xs font-semibold text-pathwise-muted">{t("class.needsServer")}</p> : null}
      {message ? <p className="mt-2 text-sm font-semibold text-emerald-600">{message}</p> : null}
      {error ? <p className="mt-2 text-sm font-semibold text-[#E75555]">{error}</p> : null}
    </ContentCard>
  );
}
