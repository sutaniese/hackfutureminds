"use client";

import { useI18n } from "@/i18n/I18nProvider";
import type { Task } from "@/lib/learning/types";

/**
 * Поле ответа под тип задания: варианты, число или короткий текст.
 * Значение всегда строка — индекс варианта либо введённый ответ.
 */
export function AnswerField({
  task,
  value,
  onChange,
  disabled = false,
  correctValue,
  showResult = false,
}: {
  task: Task;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Эталонное значение — подсвечивается после проверки. */
  correctValue?: string;
  showResult?: boolean;
}) {
  const { t } = useI18n();
  if (task.type === "single" && task.options) {
    return (
      <fieldset className="mt-5 grid gap-2.5" disabled={disabled}>
        <legend className="sr-only">{t("answer.options")}</legend>
        {task.options.map((option, index) => {
          const optionValue = String(index);
          const selected = value === optionValue;
          const isCorrect = showResult && correctValue === optionValue;
          const isWrongPick = showResult && selected && correctValue !== optionValue;

          const stateClass = isCorrect
            ? "border-emerald-400 bg-emerald-500/10"
            : isWrongPick
              ? "border-[#FF6B6B] bg-[#FF6B6B]/10"
              : selected
                ? "border-[#6C63FF] bg-[#6C63FF]/5"
                : "border-slate-200 bg-white hover:border-[#6C63FF]/50";

          return (
            <label
              key={option}
              className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-sm font-semibold leading-6 text-pathwise-ink transition ${stateClass} ${
                disabled ? "cursor-default" : ""
              }`}
            >
              <input
                type="radio"
                name={`task-${task.id}`}
                value={optionValue}
                checked={selected}
                onChange={() => onChange(optionValue)}
                disabled={disabled}
                className="mt-1 h-4 w-4 shrink-0 accent-[#6C63FF]"
              />
              <span className="min-w-0 flex-1">{option}</span>
              {isCorrect ? (
                <span className="shrink-0 text-xs font-black text-emerald-700">{t("answer.okMark")}</span>
              ) : null}
            </label>
          );
        })}
      </fieldset>
    );
  }

  return (
    <div className="mt-5">
      <label
        htmlFor={`answer-${task.id}`}
        className="text-xs font-bold uppercase tracking-[0.14em] text-pathwise-muted"
      >
        {task.type === "numeric" ? t("answer.numeric") : t("answer.short")}
      </label>
      <input
        id={`answer-${task.id}`}
        type={task.type === "numeric" ? "text" : "text"}
        inputMode={task.type === "numeric" ? "decimal" : "text"}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={task.type === "numeric" ? "Например: 42" : "Введите ответ"}
        className="pw-input mt-2 w-full px-4 py-3 text-sm font-semibold disabled:opacity-70"
        autoComplete="off"
      />
      {showResult && correctValue ? (
        <p className="mt-2 text-xs font-bold text-pathwise-muted">
          {t("topic.rightIs", { answer: correctValue })}
        </p>
      ) : null}
    </div>
  );
}
