import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneView } from "./scenes";
import { FONT_FACES } from "./fonts";
import { CLIP } from "./theme";
import type { ClipScript, ClipTiming } from "./types";

export type TopicVideoProps = {
  script: ClipScript;
  timing: ClipTiming;
};

function Chrome({ script, progress }: { script: ClipScript; progress: number }) {
  return (
    <div style={{ padding: "36px 40px 0", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 34, fontWeight: 800, color: CLIP.white, letterSpacing: -1 }}>
          teñ<span style={{ color: CLIP.purple }}>.</span>
        </div>
        <div
          style={{
            background: "#1B1730",
            color: script.accent,
            border: `1px solid ${script.accent}55`,
            borderRadius: 999,
            padding: "8px 16px",
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: 0.6,
          }}
        >
          {script.subject}
        </div>
      </div>
      <div style={{ height: 6, background: "#241F3A", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${progress * 100}%`, height: "100%", background: CLIP.purple }} />
      </div>
    </div>
  );
}

function Orbs() {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [0, 300], [0, 40]);
  return (
    <>
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: CLIP.purple,
          opacity: 0.22,
          top: -80 + a,
          right: -160,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 340,
          height: 340,
          borderRadius: "50%",
          background: CLIP.purpleSoft,
          opacity: 0.16,
          bottom: 220,
          left: -120,
          transform: `translateY(${-a * 0.6}px)`,
        }}
      />
    </>
  );
}

function Caption({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div style={{ position: "absolute", left: 32, right: 32, bottom: 42 }}>
      <div
        style={{
          background: "#0E0C18",
          border: `2px solid ${CLIP.cardLine}`,
          borderRadius: 24,
          padding: "18px 22px",
          color: CLIP.white,
          fontSize: 28,
          fontWeight: 700,
          lineHeight: 1.35,
        }}
      >
        {text}
      </div>
    </div>
  );
}

export const TopicVideo: React.FC<TopicVideoProps> = ({ script, timing }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const progress = frame / Math.max(1, durationInFrames - 1);
  let offset = 0;

  return (
    <AbsoluteFill style={{ background: CLIP.ink, fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{FONT_FACES}</style>
      <Orbs />
      <Audio src={staticFile(timing.voiceFile)} />
      {script.scenes.map((scene, index) => {
        const seconds = timing.sceneSeconds[index] ?? 4;
        const durationInFramesScene = Math.max(1, Math.round(seconds * fps));
        const from = offset;
        offset += durationInFramesScene;
        return (
          <Sequence key={`${scene.kind}-${index}`} from={from} durationInFrames={durationInFramesScene}>
            <AbsoluteFill style={{ padding: "128px 40px 220px" }}>
              <SceneView scene={scene} accent={script.accent} />
            </AbsoluteFill>
            <Caption text={scene.caption} />
          </Sequence>
        );
      })}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <Chrome script={script} progress={progress} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
