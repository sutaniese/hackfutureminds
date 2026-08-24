"use client";

import Link from "next/link";
import { ContentCard, PageHero } from "@/components/ui/PageHero";
import { useAuth } from "@/components/shell/useAuth";
import type { DisabilitySupportType } from "@/lib/auth";

const SUPPORT_LABELS: Record<DisabilitySupportType, string> = {
  visual: "Зрение",
  hearing: "Слух",
  mobility: "Передвижение",
  learning: "Обучение / дислексия",
  neurodivergent: "Нейроотличия",
  chronic: "Хроническое состояние",
  speech: "Речь / коммуникация",
  "mental-health": "Психологическая поддержка",
  other: "Другое",
};

const SUPPORT_ACTIONS: Record<DisabilitySupportType, string[]> = {
  visual: [
    "Материалы крупным шрифтом и с высоким контрастом.",
    "Приоритет аудио-объяснений и структурированных чеклистов.",
  ],
  hearing: [
    "Текстовые инструкции вместо голосовых подсказок.",
    "Субтитры и письменные итоги после консультаций.",
  ],
  mobility: [
    "Онлайн-встречи и гибкие дедлайны для документов.",
    "Маршруты с пометкой доступности кампуса и транспорта.",
  ],
  learning: [
    "Короткие шаги, повторение ключевых задач и визуальные подсказки.",
    "Дополнительное время на тесты, эссе и сбор портфолио.",
  ],
  neurodivergent: [
    "Предсказуемый план недели без перегруза уведомлениями.",
    "Разбивка больших задач на понятные микро-шаги.",
  ],
  chronic: [
    "Гибкий темп подготовки с резервными датами.",
    "Онлайн-альтернативы для консультаций и занятий.",
  ],
  speech: [
    "Возможность отвечать письменно вместо устной презентации.",
    "Шаблоны писем для учителя, родителя и приёмной комиссии.",
  ],
  "mental-health": [
    "Спокойный план без жёстких дедлайнов по умолчанию.",
    "Фокус на поддерживающих задачах и регулярных маленьких победах.",
  ],
  other: [
    "Индивидуальная заметка будет учитываться в плане.",
    "Наставник может адаптировать формат задач под ситуацию.",
  ],
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SupportProfileView() {
  const { user, status } = useAuth();
  const support = user?.accessibilitySupport;
  const selectedTypes = support?.supportTypes ?? [];
  const aiRecommendations = support?.document?.evaluation?.recommendedAccommodations ?? [];
  const recommendations = [
    ...aiRecommendations,
    ...selectedTypes.flatMap((type) => SUPPORT_ACTIONS[type]),
  ];

  if (status === "loading") {
    return (
      <ContentCard className="text-sm text-pathwise-muted">
        Загружаем персональную страницу поддержки…
      </ContentCard>
    );
  }

  if (!support?.enabled) {
    return (
      <div className="flex flex-col gap-4">
        <PageHero
          kicker="Support profile"
          title="Персональная поддержка ещё не настроена"
          description="Эта страница появится после того, как студент отметит особые образовательные потребности при регистрации."
        />
        <ContentCard className="text-sm leading-6 text-pathwise-muted">
          Если вы уже зарегистрированы как студент, создайте новый профиль с отмеченной
          поддержкой или попросите администратора перенести данные в будущей backend-версии.
        </ContentCard>
        <Link href="/onboarding" className="pw-secondary-btn pw-focus self-start px-5 text-sm">
          Вернуться к анкете
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        kicker="Personal support"
        title="Твоя персональная страница поддержки"
        description="Здесь собраны выбранные потребности, подтверждающий документ и адаптации для карьерного плана, грантов и портфолио."
      />

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <ContentCard>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-pathwise-accent-strong">
            Профиль
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-pathwise-ink">
            {user?.name?.trim() || user?.email}
          </h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {selectedTypes.length ? (
              selectedTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-full bg-pathwise-accent-soft px-3 py-1 text-xs font-bold text-pathwise-accent-strong"
                >
                  {SUPPORT_LABELS[type]}
                </span>
              ))
            ) : (
              <span className="text-sm text-pathwise-muted">
                Тип поддержки не выбран, но профиль отмечен как индивидуальный.
              </span>
            )}
          </div>
          {support.notes ? (
            <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
              {support.notes}
            </p>
          ) : null}
        </ContentCard>

        <ContentCard>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-pathwise-accent-strong">
            Документ
          </p>
          {support.document ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black text-pathwise-ink">{support.document.name}</p>
              <p className="mt-1 text-xs font-semibold text-pathwise-muted">
                {support.document.type} · {formatBytes(support.document.size)}
              </p>
              <p className="mt-3 text-xs leading-5 text-pathwise-muted">
                AI анализирует изображение документа при регистрации. PDF/DOCX помечаются
                для ручной проверки, пока нет защищённого парсинга файлов.
              </p>
              {support.document.evaluation ? (
                <div className="mt-4 rounded-2xl bg-white p-4 text-sm ring-1 ring-slate-200">
                  <p className="font-black text-pathwise-ink">
                    AI оценка:{" "}
                    {support.document.evaluation.status === "reviewed"
                      ? "оценено"
                      : "нужна ручная проверка"}
                  </p>
                  <p className="mt-2 leading-6 text-slate-700">
                    {support.document.evaluation.summary}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-pathwise-muted">
                    Confidence: {Math.round(support.document.evaluation.confidence * 100)}%
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-pathwise-muted ring-1 ring-slate-200">
              Документ не приложен. Можно использовать заметку, справку от школы или
              загрузку файла в будущей версии.
            </p>
          )}
        </ContentCard>
      </section>

      <ContentCard>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-pathwise-accent-strong">
          Рекомендованные адаптации
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(recommendations.length ? recommendations : SUPPORT_ACTIONS.other).map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold leading-6 text-slate-700 shadow-sm"
            >
              {item}
            </div>
          ))}
        </div>
      </ContentCard>

      <div className="flex flex-wrap gap-3">
        <Link href="/onboarding" className="pw-primary-btn pw-focus px-5 text-sm">
          Продолжить анкету
        </Link>
        <Link href="/results" className="pw-secondary-btn pw-focus px-5 text-sm">
          Открыть карьерный план
        </Link>
      </div>
    </div>
  );
}
