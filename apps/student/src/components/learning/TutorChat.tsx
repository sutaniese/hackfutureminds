"use client";

import { useCallback, useRef, useState } from "react";
import { readJsonResponse } from "@/lib/http-json";
import { subjectTitle } from "@/lib/learning/catalog";
import type { Topic } from "@/lib/learning/types";
import { Pill } from "./LearningUI";

type Message = { role: "user" | "assistant"; text: string; source?: "ai" | "local" };

const QUICK_PROMPTS = [
  "Объясни тему простыми словами",
  "С чего начать решение?",
  "Приведи похожий пример",
];

/** AI-репетитор по конкретной теме: контекст берётся из конспекта. */
export function TutorChat({ topic, grade }: { topic: Topic; grade?: number }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || loading) return;

      const history = messages.map((message) => ({ role: message.role, text: message.text }));
      setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
      setInput("");
      setLoading(true);

      try {
        const response = await fetch("/api/learning/tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: trimmed,
            topicTitle: topic.title,
            subjectTitle: subjectTitle(topic.subjectId),
            grade,
            theory: topic.theory,
            history,
          }),
        });
        const data = (await readJsonResponse<{ answer: string; source: "ai" | "local" }>(
          response,
        )) as { answer?: string; source?: "ai" | "local"; error?: string };

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text:
              data.answer ??
              data.error ??
              "Не удалось получить ответ. Попробуй переформулировать вопрос.",
            source: data.source ?? "local",
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "Сеть недоступна. Открой конспект темы — там разобраны те же правила.",
            source: "local",
          },
        ]);
      } finally {
        setLoading(false);
        requestAnimationFrame(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
        });
      }
    },
    [grade, loading, messages, topic.subjectId, topic.theory, topic.title],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-black tracking-tight text-pathwise-ink">AI-репетитор</h3>
          <p className="mt-1 text-sm text-pathwise-muted">
            Задай вопрос по теме «{topic.title}» — ответ строится по конспекту темы.
          </p>
        </div>
        <Pill tone="accent">Контекст темы</Pill>
      </div>

      <div
        ref={listRef}
        className="max-h-96 min-h-32 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="text-sm leading-6 text-pathwise-muted">
            Пока сообщений нет. Спроси, что непонятно — репетитор объяснит по шагам и задаст
            встречный вопрос на понимание.
          </p>
        ) : (
          <div className="grid gap-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-auto bg-[#6C63FF] text-white"
                    : "bg-white text-pathwise-ink ring-1 ring-slate-200"
                }`}
              >
                {message.text}
                {message.role === "assistant" && message.source === "ai" ? (
                  <span className="mt-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#6C63FF]">
                    Ответ от AI
                  </span>
                ) : message.role === "assistant" && message.source === "local" ? (
                  <span className="mt-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-pathwise-muted">
                    Ответ из конспекта
                  </span>
                ) : null}
              </div>
            ))}
            {loading ? (
              <div className="max-w-[92%] rounded-2xl bg-white px-4 py-3 text-sm text-pathwise-muted ring-1 ring-slate-200">
                Думаю над ответом…
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void ask(prompt)}
            disabled={loading}
            className="min-h-10 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-bold text-pathwise-ink transition hover:border-[#6C63FF]/50 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(input);
        }}
      >
        <label htmlFor="tutor-input" className="sr-only">
          Вопрос репетитору
        </label>
        <input
          id="tutor-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Например: почему здесь нужен дискриминант?"
          className="pw-input min-w-0 flex-1 px-4 py-3 text-sm"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={loading || input.trim().length === 0}
          className="pw-btn-primary shrink-0 text-sm disabled:opacity-50"
        >
          Спросить
        </button>
      </form>
    </div>
  );
}
