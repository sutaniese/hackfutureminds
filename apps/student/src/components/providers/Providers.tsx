"use client";

import { I18nProvider } from "@/i18n/I18nProvider";
import { UserProgressProvider } from "@/components/gamification/UserProgressProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <UserProgressProvider>{children}</UserProgressProvider>
    </I18nProvider>
  );
}
