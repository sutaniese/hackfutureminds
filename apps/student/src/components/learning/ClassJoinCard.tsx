"use client";

import { useState, type FormEvent } from "react";
import { joinClassByCode } from "@/lib/learning/remote";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ContentCard } from "@/components/ui/PageHero";

export function ClassJoinCard({ currentCode }: { currentCode?: string | null }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured() && !currentCode) {
    return (
      <ContentCard>
        <h3 className="text-lg font-black tracking-tight text-pathwise-ink">Код класса</h3>
        <p className="mt-2 text-sm leading-6 text-pathwise-muted">
          Чтобы учитель на другом устройстве увидел прогресс, на сервере должны стоять
          переменные Supabase. Сейчас аккаунт локальный — код класса заработает после настройки env.
        </p>
      </ContentCard>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!code.trim()) return;
    setBusy(true);
    try {
      const joined = await joinClassByCode(code);
      setMessage(`Вы в классе «${joined.name}». Код: ${joined.inviteCode}`);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось вступить в класс");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ContentCard>
      <h3 className="text-lg font-black tracking-tight text-pathwise-ink">Класс учителя</h3>
      <p className="mt-1 text-sm text-pathwise-muted">
        Введите код вида TN-XXXXXX с ноутбука учителя. После диагностики учитель увидит ваши пробелы.
      </p>
      {currentCode ? (
        <p className="mt-3 font-mono text-lg font-black tracking-widest text-[#554dd6]">{currentCode}</p>
      ) : null}
      <form onSubmit={onSubmit} className="mt-4 flex flex-wrap gap-2">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="TN-XXXXXX"
          className="pw-input min-h-12 flex-1 px-4 text-sm font-bold tracking-widest"
          aria-label="Код приглашения"
        />
        <button type="submit" disabled={busy || !code.trim()} className="pw-btn-primary text-sm disabled:opacity-50">
          {busy ? "Вступаем…" : "Вступить"}
        </button>
      </form>
      {message ? <p className="mt-2 text-sm font-semibold text-emerald-600">{message}</p> : null}
      {error ? <p className="mt-2 text-sm font-semibold text-[#E75555]">{error}</p> : null}
    </ContentCard>
  );
}
