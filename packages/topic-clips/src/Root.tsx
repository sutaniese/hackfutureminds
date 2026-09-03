import React from "react";
import { Composition, type CalculateMetadataFunction } from "remotion";
import { CLIP_SCRIPTS } from "./scripts";
import { TopicVideo, type TopicVideoProps } from "./TopicVideo";
import { CLIP } from "./theme";
import type { ClipTiming } from "./types";
import timingsJson from "../public/timings.json";

const timings = timingsJson as Record<string, ClipTiming>;

const calculateMetadata: CalculateMetadataFunction<TopicVideoProps> = ({ props }) => {
  const seconds = props.timing.totalSeconds;
  return {
    durationInFrames: Math.max(1, Math.round(seconds * CLIP.fps)),
    fps: CLIP.fps,
    width: CLIP.width,
    height: CLIP.height,
  };
};

export const Root: React.FC = () => {
  return (
    <>
      {CLIP_SCRIPTS.map((script) => {
        const timing = timings[script.id];
        if (!timing) return null;
        return (
          <Composition
            key={script.id}
            id={script.id}
            component={TopicVideo}
            durationInFrames={Math.max(1, Math.round(timing.totalSeconds * CLIP.fps))}
            fps={CLIP.fps}
            width={CLIP.width}
            height={CLIP.height}
            defaultProps={{ script, timing }}
            calculateMetadata={calculateMetadata}
          />
        );
      })}
    </>
  );
};
