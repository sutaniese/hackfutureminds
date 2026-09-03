"use client";

import { VoiceCoach } from "./VoiceCoach";
import { VoiceControl } from "./VoiceControl";

/** Persistent floating cluster: hands-free control + mentor coach. Survives route changes. */
export function VoiceCluster() {
  return (
    <div className="pointer-events-none fixed bottom-[calc(var(--pw-nav,4.5rem)+1rem)] right-4 z-[60] flex flex-col items-end gap-3">
      <VoiceControl />
      <VoiceCoach />
    </div>
  );
}
