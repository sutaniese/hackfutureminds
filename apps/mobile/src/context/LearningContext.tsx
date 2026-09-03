import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiGet } from "../lib/api";
import { isSupabaseConfigured } from "../lib/env";
import {
  applyRemoteLearning,
  readAllTopics,
  readLearningProfile,
  readLearningState,
  subscribeLearning,
  type LearningProfile,
  type LearningState,
} from "../lib/learning/store";
import type { Topic } from "../lib/learning/types";
import { useAuth } from "./AuthContext";

type LearningValue = {
  profile: LearningProfile | null;
  state: LearningState;
  topics: Topic[];
  refresh: () => void;
};

const LearningContext = createContext<LearningValue | null>(null);

export function LearningProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => subscribeLearning(refresh), [refresh]);

  useEffect(() => {
    if (!user || user.role !== "student" || !isSupabaseConfigured()) return;
    let cancelled = false;

    const hydrate = () => {
      void Promise.all([
        apiGet<{
          profile?: LearningProfile | null;
          state?: LearningState | null;
          topics?: Topic[];
        }>("/api/learning/progress"),
        apiGet<{ topics?: Topic[] }>("/api/learning/topics"),
      ])
        .then(([progress, catalog]) => {
          if (cancelled) return;
          const topics = [
            ...(progress.topics ?? []),
            ...(catalog.topics ?? []),
          ];
          applyRemoteLearning({
            profile: progress.profile,
            state: progress.state,
            topics,
          });
        })
        .catch(() => undefined);
    };

    hydrate();
    const timer = setInterval(hydrate, 20_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user]);

  const value = useMemo<LearningValue>(() => {
    void tick;
    return {
      profile: readLearningProfile(),
      state: readLearningState(),
      topics: readAllTopics(),
      refresh,
    };
  }, [tick, refresh, user]);

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning(): LearningValue {
  const ctx = useContext(LearningContext);
  if (!ctx) throw new Error("useLearning must be used inside LearningProvider");
  return ctx;
}
