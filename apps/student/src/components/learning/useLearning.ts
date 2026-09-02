"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EMPTY_STATE,
  applyRemoteLearning,
  readAllTopics,
  readLearningProfile,
  readLearningState,
  subscribeLearning,
  type LearningProfile,
  type LearningState,
} from "@/lib/learning/store";
import type { Topic } from "@/lib/learning/types";
import { BASE_TOPICS } from "@/lib/learning/catalog";
import { pullLearningBundle } from "@/lib/learning/remote";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { localizeTopic } from "@/lib/learning/kk-overlay";
import { useI18n } from "@/i18n/I18nProvider";

export function useLearning() {
  const { locale } = useI18n();
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [state, setState] = useState<LearningState>(EMPTY_STATE);
  const [topics, setTopics] = useState<Topic[]>(() => [...BASE_TOPICS]);
  const [ready, setReady] = useState(false);
  const [classId, setClassId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const sync = useCallback(() => {
    setProfile(readLearningProfile());
    setState(readLearningState());
    setTopics(readAllTopics().map((topic) => localizeTopic(topic, locale)));
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    sync();
    if (!isSupabaseConfigured()) {
      setReady(true);
      return;
    }
    void pullLearningBundle().then((bundle) => {
      if (cancelled) return;
      if (bundle) {
        applyRemoteLearning({
          profile: bundle.profile ?? undefined,
          state: bundle.state ?? undefined,
          topics: bundle.topics,
        });
        setClassId(bundle.classId);
        setInviteCode(bundle.inviteCode);
        sync();
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [sync]);

  useEffect(() => {
    return subscribeLearning(sync);
  }, [sync]);

  return useMemo(
    () => ({ profile, state, topics, ready, refresh: sync, classId, inviteCode }),
    [classId, inviteCode, locale, profile, ready, state, sync, topics],
  );
}
