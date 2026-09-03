"use client";

import { I18nProvider } from "@/i18n/I18nProvider";
import { UserProgressProvider } from "@/components/gamification/UserProgressProvider";
import { VoiceCluster } from "@/components/voice/VoiceCluster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <UserProgressProvider>
        {children}
        <VoiceCluster />
      </UserProgressProvider>
    </I18nProvider>
  );
}
