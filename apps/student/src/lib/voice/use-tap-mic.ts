"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  idleWavePoints,
  prefersReducedMotion,
  rmsFromTimeDomain,
  shouldStopOnSilence,
  timeDomainToPoints,
  VOICE_SPEECH_RMS,
} from "@/lib/voice/meter";

type StopKind = "send" | "discard";

export function useTapMic(options: {
  active: boolean;
  captureWave: boolean;
  onAudio: (blob: Blob) => void;
  onStopped?: (kind: StopKind) => void;
}) {
  const { active, captureWave, onAudio, onStopped } = options;
  const [listening, setListening] = useState(false);
  const [denied, setDenied] = useState(false);
  const [points, setPoints] = useState<number[]>(() => idleWavePoints());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const heardRef = useRef(false);
  const lastLoudRef = useRef(0);
  const sendOnStopRef = useRef(true);
  const onAudioRef = useRef(onAudio);
  const onStoppedRef = useRef(onStopped);
  onAudioRef.current = onAudio;
  onStoppedRef.current = onStopped;

  const supported =
    typeof window !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof window.MediaRecorder !== "undefined";

  const teardownGraph = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    try {
      sourceRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    sourceRef.current = null;
    analyserRef.current = null;
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stop = useCallback(
    (kind: StopKind = "send") => {
      sendOnStopRef.current = kind === "send";
      const rec = recorderRef.current;
      recorderRef.current = null;
      if (rec && rec.state === "recording") rec.stop();
      else teardownGraph();
      setListening(false);
      onStoppedRef.current?.(kind);
    },
    [teardownGraph],
  );

  const start = useCallback(async (): Promise<boolean> => {
    if (!supported) {
      setDenied(true);
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      heardRef.current = false;
      lastLoudRef.current = Date.now();
      sendOnStopRef.current = true;

      const Ctx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      await ctx.resume().catch(() => undefined);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.65;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      const buffer = new Uint8Array(analyser.fftSize);
      const tick = () => {
        const node = analyserRef.current;
        if (!node) return;
        node.getByteTimeDomainData(buffer);
        const rms = rmsFromTimeDomain(buffer);
        if (captureWave && !prefersReducedMotion()) {
          setPoints(timeDomainToPoints(buffer));
        }
        const now = Date.now();
        if (rms >= VOICE_SPEECH_RMS) {
          heardRef.current = true;
          lastLoudRef.current = now;
        } else if (
          shouldStopOnSilence({
            heardSpeech: heardRef.current,
            lastLoudAt: lastLoudRef.current,
            now,
          })
        ) {
          stop("send");
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        teardownGraph();
        if (sendOnStopRef.current && audio.size > 0) onAudioRef.current(audio);
      };
      recorder.start(200);
      setListening(true);
      setDenied(false);
      return true;
    } catch {
      teardownGraph();
      setDenied(true);
      setListening(false);
      return false;
    }
  }, [captureWave, stop, supported, teardownGraph]);

  useEffect(() => {
    if (!active) stop("discard");
  }, [active, stop]);

  useEffect(() => () => stop("discard"), [stop]);

  return { listening, denied, supported, points, start, stop };
}
