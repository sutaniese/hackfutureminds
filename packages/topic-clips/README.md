# teñ. topic clips

Code-driven 40–60s vertical motion graphics for every `BASE_TOPICS` catalog id, plus the Kazakh quadratic overlay.

This package is **not** an npm workspace (Remotion stays isolated from the Next.js / Expo installs). Run `npm install` inside this folder.

## Re-render

```bash
# from repo root
python3 -m pip install --user edge-tts
cd packages/topic-clips
npm install
npm run build:clips
```

Writes `apps/student/public/clips/{id}.mp4`.

- Compositions live in `src/` (Remotion 4, 720×1280, 30fps).
- Voiceover is Edge TTS (`ru-RU-DmitryNeural` / `kk-KZ-DauletNeural`), muxed into the MP4.
- End card is 1s «Проверка» / «Тексеру»; the quiz UI is in the web and Expo apps, not in the video.
