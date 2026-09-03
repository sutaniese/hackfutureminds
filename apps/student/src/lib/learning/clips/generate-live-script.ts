import { fallbackLiveClipScript, type LiveClipFallbackInput, type LiveClipScript } from "@pathwise/shared";
import { groqChat, isGroqConfigured } from "@/lib/learning/groq-chat";
import { listGroqChatModelCandidates } from "@/lib/groq-env";
import { parseLiveClipScriptFromModel } from "./live-script";

export type ClipGenerateReason =
  | "ok"
  | "missing_api_key"
  | "groq_timeout"
  | "groq_http_5xx"
  | "groq_http_4xx"
  | "groq_empty"
  | "json_unparseable"
  | "schema_invalid"
  | "brief_echo";

export type ClipGenerateResult = {
  script: LiveClipScript;
  source: "ai" | "fallback";
  reason: ClipGenerateReason;
  issues?: string[];
  model?: string;
};

export function classifyGroqError(error?: string, status?: number): ClipGenerateReason {
  const text = (error ?? "").toLowerCase();
  if (text.includes("not configured")) return "missing_api_key";
  if (text.includes("timed out") || text.includes("timeout") || text.includes("aborted")) return "groq_timeout";
  const code = status ?? Number((error?.match(/\((\d{3})\)/) ?? [])[1]);
  if (code >= 500) return "groq_http_5xx";
  if (code >= 400) return "groq_http_4xx";
  if (text.includes("empty")) return "groq_empty";
  return "groq_empty";
}

export function classifyParseIssues(issues: string[]): ClipGenerateReason {
  const joined = issues.join(" ").toLowerCase();
  if (joined.includes("brief_echo")) return "brief_echo";
  if (joined.includes("no json")) return "json_unparseable";
  return "schema_invalid";
}

export function teacherFallbackLine(reason: ClipGenerateReason, language: "ru" | "kk"): string {
  const ru: Record<ClipGenerateReason, string> = {
    ok: "",
    missing_api_key: "Groq не ответил: на сервере нет GROQ_API_KEY. Показан запасной сценарий из брифа, не готовый урок.",
    groq_timeout: "Groq не успел ответить. Показан запасной сценарий из брифа — это не сгенерированный урок.",
    groq_http_5xx: "Groq вернул ошибку сервера. Показан запасной сценарий из брифа — это не сгенерированный урок.",
    groq_http_4xx: "Запрос к Groq отклонён (модель или формат). Показан запасной сценарий из брифа — это не сгенерированный урок.",
    groq_empty: "Groq вернул пустой ответ. Показан запасной сценарий из брифа — это не сгенерированный урок.",
    json_unparseable: "Groq ответил, но JSON не разобрать. Показан запасной сценарий из брифа — это не сгенерированный урок.",
    schema_invalid: "JSON Groq не прошёл проверку схемы. Показан запасной сценарий из брифа — это не сгенерированный урок.",
    brief_echo: "Модель процитировала бриф вместо урока. Показан запасной сценарий — это не готовый клип.",
  };
  const kk: Record<ClipGenerateReason, string> = {
    ok: "",
    missing_api_key: "Groq жауап бермеді: серверде GROQ_API_KEY жоқ. Брифтен резерв сценарий көрсетілді, бұл дайын сабақ емес.",
    groq_timeout: "Groq үлгермеді. Брифтен резерв сценарий көрсетілді — бұл генерацияланған сабақ емес.",
    groq_http_5xx: "Groq сервер қатесін қайтарды. Брифтен резерв сценарий көрсетілді.",
    groq_http_4xx: "Groq сұранысты қабылдамады. Брифтен резерв сценарий көрсетілді.",
    groq_empty: "Groq бос жауап берді. Брифтен резерв сценарий көрсетілді.",
    json_unparseable: "Groq жауабының JSON-ын талдау мүмкін емес. Брифтен резерв сценарий көрсетілді.",
    schema_invalid: "Groq JSON схемасынан өтпеді. Брифтен резерв сценарий көрсетілді.",
    brief_echo: "Модель брифіні дәйексөз қылып қайтарды. Резерв сценарий көрсетілді.",
  };
  return language === "kk" ? kk[reason] : ru[reason];
}

function systemPrompt(language: "ru" | "kk"): string {
  const langName = language === "kk" ? "қазақ тілінде" : "на русском языке";
  return `Ты режиссёр 40–60-секундного учебного клипа. Верни ТОЛЬКО один JSON-объект (response_format=json_object). Без markdown, без текста вокруг.
Язык всех строк: ${langName}.

Текст учителя — это BRIEF (техническое задание), а не титры и не вопрос викторины. Нельзя цитировать, пересказывать или вставлять бриф в title, heading, narration, quiz.question или options.

Сцены ДОЛЖНЫ УЧИТЬ тему: определение, формула, один разобранный пример, вывод. Для производной 10 класса обязательно раскрой: скорость изменения; определение через предел; (x^n)' и (sin x)'; пример f(x)=x^3-3x — если бриф про производную.

Схема:
{"title":"string","durationSec":48,"language":"${language}","scenes":[{"id":"s1","heading":"короткий заголовок темы","body":"string?","formula":"string?","narration":"string","visual":"formula"|"bullets"|"diagram"|"compare"}],"quiz":{"question":"string","options":["a","b","c"],"correctIndex":0,"explanation":"string","skillId":"string"}}

Правила:
- Ровно 5 или 6 сцен.
- Суммарно 120–140 слов narration (40–60 секунд).
- Формулы — обычный KaTeX-безопасный текст: без $ и без переносов внутри formula.
- quiz: один вопрос на понятие, три правдоподобных варианта, один верный, короткое explanation, skillId.
- Запрещены заглушки вроде «другое правило из соседней темы», «случайный факт без связи с условием», «случайный факт, не связанный с условием».
- Не выдумывай биографию. Учи предмет.`;
}

function userPrompt(seed: LiveClipFallbackInput): string {
  if (seed.language === "kk") {
    return [
      "BRIEF (бұл экран мәтіні емес):",
      `Тақырып өрісі: ${seed.title}`,
      `Пән: ${seed.subject ?? ""}`,
      `Сынып: ${seed.grade ?? ""}`,
      `Мұғалімнің брифі:\n${seed.prompt}`,
      "Сахналар брифіні қайталамай, тақырыпты үйретсін.",
    ].join("\n");
  }
  return [
    "BRIEF (this is not on-screen copy):",
    `Title field: ${seed.title}`,
    `Subject: ${seed.subject ?? ""}`,
    `Grade: ${seed.grade ?? ""}`,
    `Teacher brief:\n${seed.prompt}`,
    "Teach the topic. Do not quote the brief as a heading or quiz stem.",
  ].join("\n");
}

export async function generateLiveClipScript(seed: LiveClipFallbackInput): Promise<ClipGenerateResult> {
  const fallback = fallbackLiveClipScript(seed);
  const parseSeed = { language: seed.language, skillId: seed.skillId, brief: seed.prompt };

  if (!isGroqConfigured()) {
    console.error("[clips/generate] reason=missing_api_key");
    return { script: fallback, source: "fallback", reason: "missing_api_key" };
  }

  const messages = [
    { role: "system" as const, content: systemPrompt(seed.language) },
    { role: "user" as const, content: userPrompt(seed) },
  ];

  const groqOptions = {
    maxTokens: 4096,
    temperature: 0.2,
    timeoutMs: 45_000,
    json: true,
    reasoningEffort: "low" as const,
    models: listGroqChatModelCandidates(),
  };

  const first = await groqChat(messages, groqOptions);
  let parsed = parseLiveClipScriptFromModel(first.content, parseSeed);
  if (parsed.ok) {
    console.info("[clips/generate] reason=ok model=", first.model);
    return { script: parsed.script, source: "ai", reason: "ok", model: first.model };
  }

  if (!first.content) {
    const reason = classifyGroqError(first.error, first.status);
    const retryable = reason === "groq_timeout" || reason === "groq_http_5xx" || reason === "groq_empty";
    if (!retryable) {
      console.error("[clips/generate] reason=", reason, first.error);
      return { script: fallback, source: "fallback", reason, issues: [first.error || reason], model: first.model };
    }
  }

  const retryHint =
    seed.language === "kk"
      ? "JSON схемасы бұзылған немесе бриф дәйексөз болды. Толық жарамды JSON ғана қайтар: 5–6 сахна, нақты сабақ, брифсіз."
      : "JSON не подошёл к схеме или процитировал бриф. Верни только полный валидный JSON: 5–6 сцен, реальный урок, без цитаты брифа.";

  const retry = await groqChat(
    [
      ...messages,
      { role: "assistant" as const, content: first.content || "{}" },
      { role: "user" as const, content: retryHint },
    ],
    { ...groqOptions, temperature: 0.1 },
  );

  parsed = parseLiveClipScriptFromModel(retry.content, parseSeed);
  if (parsed.ok) {
    console.info("[clips/generate] reason=ok retry model=", retry.model);
    return { script: parsed.script, source: "ai", reason: "ok", model: retry.model };
  }

  const reason = retry.content
    ? classifyParseIssues(parsed.issues)
    : classifyGroqError(retry.error ?? first.error, retry.status ?? first.status);
  console.error("[clips/generate] reason=", reason, "issues=", parsed.issues, retry.error ?? first.error);
  return {
    script: fallback,
    source: "fallback",
    reason,
    issues: parsed.issues.length ? parsed.issues : [retry.error || first.error || reason],
    model: retry.model ?? first.model,
  };
}
