import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Whisper can exceed the default 10s hobby limit; set in vercel.json too. */
export const maxDuration = 60;

const GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
/** Faster than whisper-large-v3; reduces gateway timeouts on Vercel. Override with GROQ_AUDIO_MODEL. */
const DEFAULT_AUDIO_MODEL = "whisper-large-v3-turbo";
const GROQ_TRANSCRIBE_FETCH_MS = 55_000;

function parseGroqTranscriptionJson(text: string): { text?: string } | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith("<")) return null;
  try {
    return JSON.parse(trimmed) as { text?: string };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.includes("replace-me")) {
      // 200 + JSON avoids some proxies/CDNs surfacing an HTML error shell for 5xx.
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured on the server.", transcript: "" },
        { status: 200 },
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid audio form data." }, { status: 400 });
    }

    const audio = formData.get("audio");
    const locale = typeof formData.get("locale") === "string" ? String(formData.get("locale")) : "ru";
    if (!(audio instanceof Blob) || audio.size === 0) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
    }

    const groqForm = new FormData();
    groqForm.set("file", audio, "voice-command.webm");
    groqForm.set("model", process.env.GROQ_AUDIO_MODEL || DEFAULT_AUDIO_MODEL);
    groqForm.set("response_format", "json");
    if (locale === "en") groqForm.set("language", "en");
    if (locale === "ru") groqForm.set("language", "ru");
    // kk: omit `language` so Whisper can auto-detect (English phrases work with Kazakh UI).

    const response = await fetch(GROQ_TRANSCRIBE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(GROQ_TRANSCRIBE_FETCH_MS),
      body: groqForm,
    });

    const rawBody = await response.text().catch(() => "");

    if (!response.ok) {
      return NextResponse.json(
        { error: `Groq transcription failed: ${rawBody || response.statusText}` },
        { status: response.status >= 400 && response.status < 600 ? response.status : 502 },
      );
    }

    const data = parseGroqTranscriptionJson(rawBody);
    const transcript = typeof data?.text === "string" ? data.text.trim() : "";
    if (!transcript) {
      return NextResponse.json(
        { error: "Groq returned an empty or non-JSON transcript." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      transcript,
      model: process.env.GROQ_AUDIO_MODEL || DEFAULT_AUDIO_MODEL,
    });
  } catch (err) {
    console.error("[voice-transcribe]", err);
    const name = err instanceof Error ? err.name : "";
    if (name === "AbortError" || name === "TimeoutError") {
      return NextResponse.json(
        {
          error:
            "Transcription timed out. Try a shorter phrase, type the command below, or set a longer Vercel function maxDuration for this route.",
          transcript: "",
        },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: "Transcription failed unexpectedly. Check server logs.", transcript: "" },
      { status: 500 },
    );
  }
}
