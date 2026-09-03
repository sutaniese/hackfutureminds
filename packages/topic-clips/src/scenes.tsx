import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CLIP } from "./theme";
import type { ClipScene } from "./types";

function useEnter(delay = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 90, mass: 0.7 } });
  const y = interpolate(t, [0, 1], [28, 0]);
  return { opacity: t, transform: `translateY(${y}px)` };
}

function Card({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const enter = useEnter(delay);
  return (
    <div
      style={{
        ...enter,
        background: CLIP.card,
        border: `2px solid ${CLIP.cardLine}`,
        borderRadius: 28,
        padding: "28px 30px",
      }}
    >
      {children}
    </div>
  );
}

function Kicker({ children, color }: { children?: string; color: string }) {
  if (!children) return null;
  return (
    <div
      style={{
        color,
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: 2.4,
        textTransform: "uppercase",
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

function Heading({ children }: { children: string }) {
  const enter = useEnter(2);
  return (
    <div style={{ ...enter, fontSize: 54, fontWeight: 800, lineHeight: 1.12, color: CLIP.white, letterSpacing: -1.2 }}>
      {children}
    </div>
  );
}

function Formula({ text }: { text: string }) {
  const enter = useEnter(8);
  return (
    <div
      style={{
        ...enter,
        marginTop: 28,
        background: "#100E1C",
        borderLeft: `8px solid ${CLIP.purple}`,
        borderRadius: 20,
        padding: "22px 24px",
        color: CLIP.white,
        fontFamily: "JetBrains Mono, ui-monospace, monospace",
        fontSize: 34,
        fontWeight: 700,
        lineHeight: 1.35,
        letterSpacing: -0.4,
      }}
    >
      {text}
    </div>
  );
}

function Note({ text }: { text?: string }) {
  if (!text) return null;
  const enter = useEnter(14);
  return (
    <div style={{ ...enter, marginTop: 16, color: CLIP.purpleSoft, fontSize: 26, fontWeight: 650, lineHeight: 1.35 }}>
      {text}
    </div>
  );
}

export function SceneView({ scene, accent }: { scene: ClipScene; accent: string }) {
  const frame = useCurrentFrame();
  if (scene.kind === "title") {
    const scale = interpolate(frame, [0, 16], [0.92, 1], { extrapolateRight: "clamp" });
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 760, transform: `scale(${scale})` }}>
        <Kicker color={accent}>{scene.kicker}</Kicker>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, color: CLIP.white, letterSpacing: -2 }}>{scene.heading}</div>
        <div style={{ width: 120, height: 8, background: accent, borderRadius: 99, marginTop: 28 }} />
        <div style={{ marginTop: 28, color: CLIP.muted, fontSize: 32, fontWeight: 650, lineHeight: 1.35 }}>{scene.caption}</div>
      </div>
    );
  }

  if (scene.kind === "end") {
    const pop = spring({ frame, fps: 30, config: { damping: 12, stiffness: 120 } });
    return (
      <div style={{ minHeight: 760, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            transform: `scale(${pop})`,
            width: 220,
            height: 220,
            borderRadius: 80,
            background: CLIP.purple,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 72,
            fontWeight: 800,
          }}
        >
          ?
        </div>
        <div style={{ marginTop: 36, fontSize: 72, fontWeight: 800, color: CLIP.white }}>{scene.heading}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, minHeight: 760 }}>
      <Kicker color={accent}>{scene.kicker}</Kicker>
      <Heading>{scene.heading}</Heading>
      {scene.formula ? <Formula text={scene.formula} /> : null}
      <Note text={scene.note} />
      {scene.chips ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
          {scene.chips.map((chip, i) => (
            <Card key={chip.label} delay={6 + i * 5}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
                <div style={{ color: accent, fontFamily: "JetBrains Mono, monospace", fontWeight: 800, fontSize: 28 }}>{chip.label}</div>
                <div style={{ color: CLIP.white, fontWeight: 750, fontSize: 28, textAlign: "right" }}>{chip.value}</div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
      {scene.steps ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
          {scene.steps.map((step, i) => (
            <Card key={step.n} delay={6 + i * 5}>
              <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                <div
                  style={{
                    minWidth: 56,
                    height: 56,
                    borderRadius: 18,
                    background: accent,
                    color: "white",
                    fontWeight: 800,
                    fontSize: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {step.n}
                </div>
                <div style={{ color: CLIP.white, fontSize: 30, fontWeight: 700, lineHeight: 1.3 }}>{step.text}</div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
      {scene.code ? (
        <Card delay={8}>
          <div style={{ color: "#8B83C9", fontSize: 18, fontWeight: 800, letterSpacing: 2, marginBottom: 14 }}>PYTHON</div>
          <pre
            style={{
              margin: 0,
              fontFamily: "JetBrains Mono, ui-monospace, monospace",
              fontSize: 26,
              lineHeight: 1.45,
              color: CLIP.white,
              fontWeight: 650,
              whiteSpace: "pre-wrap",
            }}
          >
            {scene.code}
          </pre>
        </Card>
      ) : null}
      {scene.events ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
          {scene.events.map((event, i) => (
            <Card key={event.year} delay={6 + i * 6}>
              <div style={{ color: accent, fontSize: 28, fontWeight: 800 }}>{event.year}</div>
              <div style={{ color: CLIP.white, fontSize: 30, fontWeight: 700, marginTop: 8, lineHeight: 1.3 }}>{event.text}</div>
            </Card>
          ))}
        </div>
      ) : null}
      {scene.left && scene.right ? (
        <div style={{ display: "flex", gap: 14, marginTop: 18 }}>
          <Card delay={8}>
            <div style={{ color: accent, fontSize: 22, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase" }}>{scene.left.title}</div>
            <div style={{ color: CLIP.white, fontSize: 28, fontWeight: 750, marginTop: 12, lineHeight: 1.35, whiteSpace: "pre-wrap" }}>{scene.left.text}</div>
          </Card>
          <Card delay={12}>
            <div style={{ color: accent, fontSize: 22, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase" }}>{scene.right.title}</div>
            <div style={{ color: CLIP.white, fontSize: 28, fontWeight: 750, marginTop: 12, lineHeight: 1.35, whiteSpace: "pre-wrap" }}>{scene.right.text}</div>
          </Card>
        </div>
      ) : null}
      {scene.bullets ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
          {scene.bullets.map((bullet, i) => (
            <Card key={bullet} delay={6 + i * 5}>
              <div style={{ color: CLIP.white, fontSize: 32, fontWeight: 750 }}>{bullet}</div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
