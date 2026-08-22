"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BADGES,
  DEFAULT_PROGRESS,
  LEVEL_NAMES,
  PROGRESS_STORAGE_KEY,
  applyDailyStreak,
  levelFromXp,
  normalizeProgress,
  progressToNextLevel,
  type BadgeId,
  type BadgeInfo,
  type Level,
  type UserProgress,
} from "@/lib/user-progress";

type LevelUpEvent = {
  level: Level;
  id: number;
};

type BadgeEvent = {
  badge: BadgeInfo;
  id: number;
};

type UserProgressContextValue = {
  userProgress: UserProgress;
  progress: UserProgress;
  levelName: string;
  levelProgress: number;
  awardXp: (amount: number, eventId: string) => void;
  earnBadge: (badgeId: BadgeId) => void;
  setProfileCompletion: (value: number) => void;
  levelUpEvent: LevelUpEvent | null;
  levelUp: { level: Level; name: string } | null;
  clearLevelUpEvent: () => void;
  dismissLevelUp: () => void;
  badgeEvent: BadgeEvent | null;
  badgeToast: BadgeInfo | null;
  clearBadgeEvent: () => void;
  dismissBadgeToast: () => void;
};

const UserProgressContext = createContext<UserProgressContextValue | null>(null);

function loadProgress(): UserProgress {
  if (typeof window === "undefined") return DEFAULT_PROGRESS;
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    return raw ? normalizeProgress(JSON.parse(raw) as unknown) : DEFAULT_PROGRESS;
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function saveProgress(progress: UserProgress) {
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* localStorage can fail in private mode */
  }
}

export function UserProgressProvider({ children }: { children: ReactNode }) {
  const [userProgress, setUserProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [levelUpEvent, setLevelUpEvent] = useState<LevelUpEvent | null>(null);
  const [badgeEvent, setBadgeEvent] = useState<BadgeEvent | null>(null);

  useEffect(() => {
    setUserProgress(applyDailyStreak(loadProgress()));
  }, []);

  useEffect(() => {
    saveProgress(userProgress);
  }, [userProgress]);

  const awardXp = useCallback((amount: number, eventId: string) => {
    setUserProgress((current) => {
      if (current.completedEvents.includes(eventId)) return current;
      const previousLevel = current.level;
      const xp = Math.max(0, current.xp + amount);
      const nextLevel = levelFromXp(xp);
      if (nextLevel > previousLevel) {
        setLevelUpEvent({ level: nextLevel, id: Date.now() });
      }
      return {
        ...current,
        xp,
        level: nextLevel,
        completedEvents: [...current.completedEvents, eventId],
      };
    });
  }, []);

  const earnBadge = useCallback((badgeId: BadgeId) => {
    setUserProgress((current) => {
      if (current.badges.includes(badgeId)) return current;
      const badge = BADGES[badgeId];
      setBadgeEvent({ badge, id: Date.now() });
      return {
        ...current,
        badges: [...current.badges, badgeId],
      };
    });
  }, []);

  const setProfileCompletion = useCallback((value: number) => {
    setUserProgress((current) => ({
      ...current,
      profileCompletion: Math.min(100, Math.max(0, Math.round(value))),
    }));
  }, []);

  const value = useMemo<UserProgressContextValue>(
    () => ({
      userProgress,
      progress: userProgress,
      levelName: LEVEL_NAMES[userProgress.level],
      levelProgress: Math.round(progressToNextLevel(userProgress)),
      awardXp,
      earnBadge,
      setProfileCompletion,
      levelUpEvent,
      levelUp: levelUpEvent
        ? { level: levelUpEvent.level, name: LEVEL_NAMES[levelUpEvent.level] }
        : null,
      clearLevelUpEvent: () => setLevelUpEvent(null),
      dismissLevelUp: () => setLevelUpEvent(null),
      badgeEvent,
      badgeToast: badgeEvent?.badge ?? null,
      clearBadgeEvent: () => setBadgeEvent(null),
      dismissBadgeToast: () => setBadgeEvent(null),
    }),
    [awardXp, badgeEvent, earnBadge, levelUpEvent, setProfileCompletion, userProgress],
  );

  return (
    <UserProgressContext.Provider value={value}>
      {children}
    </UserProgressContext.Provider>
  );
}

export function useUserProgress() {
  const context = useContext(UserProgressContext);
  if (!context) {
    throw new Error("useUserProgress must be used inside UserProgressProvider");
  }
  return context;
}
