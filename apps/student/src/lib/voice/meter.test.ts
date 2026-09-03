import { describe, expect, it } from "vitest";
import {
  idleWavePoints,
  meteringToLevel,
  rmsFromTimeDomain,
  shouldStopOnSilence,
  timeDomainToPoints,
  waveDisplay,
} from "./meter";

describe("voice meter", () => {
  it("auto-stops only after speech then ~1.2s of quiet", () => {
    expect(shouldStopOnSilence({ heardSpeech: false, lastLoudAt: 0, now: 5000 })).toBe(false);
    expect(shouldStopOnSilence({ heardSpeech: true, lastLoudAt: 1000, now: 1800 })).toBe(false);
    expect(shouldStopOnSilence({ heardSpeech: true, lastLoudAt: 1000, now: 2200 })).toBe(true);
  });

  it("rms is near zero on a flat line and rises when the waveform moves", () => {
    const flat = Uint8Array.from({ length: 32 }, () => 128);
    const loud = Uint8Array.from({ length: 32 }, (_, i) => (i % 2 === 0 ? 20 : 230));
    expect(rmsFromTimeDomain(flat)).toBeLessThan(0.01);
    expect(rmsFromTimeDomain(loud)).toBeGreaterThan(0.5);
  });

  it("coach waves freeze while processing and hide while TTS speaks", () => {
    expect(waveDisplay("idle", false, "coach")).toBe("idle");
    expect(waveDisplay("listening", false, "coach")).toBe("live");
    expect(waveDisplay("listening", true, "coach")).toBe("static");
    expect(waveDisplay("processing", false, "coach")).toBe("frozen");
    expect(waveDisplay("speaking", false, "coach")).toBe("off");
    expect(waveDisplay("listening", false, "control")).toBe("off");
  });

  it("maps analyser bytes to a waveform, idle is a flat midline", () => {
    expect(idleWavePoints(4).every((y) => y === 0.5)).toBe(true);
    const pts = timeDomainToPoints([0, 128, 255], 3);
    expect(pts[0]).toBeCloseTo(0);
    expect(pts[1]).toBeCloseTo(128 / 255);
    expect(pts[2]).toBeCloseTo(1);
  });

  it("expo metering is louder as dB approaches 0", () => {
    expect(meteringToLevel(-80)).toBe(0);
    expect(meteringToLevel(0)).toBe(1);
    expect(meteringToLevel(-40)).toBeGreaterThan(meteringToLevel(-70));
  });
});
