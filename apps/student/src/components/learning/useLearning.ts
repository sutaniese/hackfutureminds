"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EMPTY_STATE,
  readAllTopics,
  readLearningProfile,
  readLearningState,
  subscribeLearning,
  type LearningProfile,
  type LearningState,
} from "@/lib/learning/store";
import type { Topic } from "@/lib/learning/types";
import { BASE_TOPICS } from "@/lib/learning/catalog";

/**
 * Единая точка чтения учебного состояния. Первый рендер идёт с базовым
 * каталогом (SSR-safe), после монтирования подхватывает localStorage
 * и подписывается на изменения — в том числе из других вкладок.
 */
export function useLearning() {
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [state, setState] = useState<LearningState>(EMPTY_STATE);
  const [topics, setTopics] = useState<Topic[]>(() => [...BASE_TOPICS]);
  const [ready, setReady] = useState(false);

  const sync = useCallback(() => {
    setProfile(readLearningProfile());
    setState(readLearningState());
    setTopics(readAllTopics());
  }, []);

  useEffect(() => {
    sync();
    setReady(true);
    return subscribeLearning(sync);
  }, [sync]);

  return useMemo(
    () => ({ profile, state, topics, ready, refresh: sync }),
    [profile, ready, state, sync, topics],
  );
}
