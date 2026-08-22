import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const DEFAULT_AUDIO_MODEL = "whisper-large-v3";

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes("replace-me")) {
    return NextResponse.json({ error: "GROQ_API_KEY is missing." }, { status: 500 });
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

  const response = await fetch(GROQ_TRANSCRIBE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: groqForm,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return NextResponse.json(
      { error: `Groq transcription failed: ${text || response.statusText}` },
      { status: response.status },
    );
  }

  const data = (await response.json()) as { text?: string };
  const transcript = typeof data.text === "string" ? data.text.trim() : "";
  if (!transcript) {
    return NextResponse.json({ error: "Groq returned an empty transcript." }, { status: 502 });
  }

  return NextResponse.json({ transcript, model: process.env.GROQ_AUDIO_MODEL || DEFAULT_AUDIO_MODEL });
}
