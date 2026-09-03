import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { videoClipFor } from "@pathwise/shared";
import { Screen } from "../../src/components/Screen";
import { Body, Card, Chip, Kicker, PrimaryButton, SecondaryButton, Stat, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { useI18n } from "../../src/context/I18nContext";
import { useLearning } from "../../src/context/LearningContext";
import { apiPost } from "../../src/lib/api";
import { findSubject } from "../../src/lib/learning/catalog";
import { localizeTopic } from "../../src/lib/learning/kk-overlay";
import {
  buildStudyPlan,
  daysUntil,
  learningSummary,
  recommendTopics,
  reviewQueue,
  weakSpots,
} from "../../src/lib/learning/recommend";
import { whyThisTopic } from "../../src/lib/learning/why-this";
import { LEVEL_LABELS } from "../../src/lib/learning/store";

export default function LearningScreen() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { profile, state, topics } = useLearning();
  const router = useRouter();
  const [planHeadline, setPlanHeadline] = useState<string | null>(null);
  const [planSource, setPlanSource] = useState<"ai" | "local" | null>(null);

  const recs = recommendTopics(topics, profile, state, 5);
  const weak = weakSpots(topics, state, 5);
  const reviews = reviewQueue(topics, profile, state);
  const summary = learningSummary(topics, profile, state);
  const localPlan = buildStudyPlan(topics, profile, state);
  const subject = profile ? findSubject(profile.subjectId) : null;
  const days = daysUntil(profile?.examDate);

  useEffect(() => {
    if (!profile || !localPlan) return;
    void apiPost<{ headline?: string; source?: "ai" | "local" }>("/api/learning/plan", {
      grade: profile.grade,
      subjectTitle: subject?.title ?? profile.subjectId,
      goals: profile.goals,
      examDate: profile.examDate,
      daysLeft: days,
      minutesPerDay: profile.minutesPerDay,
      level: state.diagnostic?.level ?? 1,
      levelLabel: LEVEL_LABELS[state.diagnostic?.level ?? 1],
      weakSpots: weak.map((item) => item.skill),
      basePlan: { headline: localPlan.headline, weeks: localPlan.weeks },
    })
      .then((data) => {
        setPlanHeadline(data.headline ?? localPlan.headline);
        setPlanSource(data.source ?? "local");
      })
      .catch(() => {
        setPlanHeadline(localPlan.headline);
        setPlanSource("local");
      });
  }, [profile?.updatedAt]);

  if (!user) {
    return (
      <Screen>
        <Card>
          <Title>{t("guard.loginTitle")}</Title>
          <Body>{t("guard.loginBody")}</Body>
          <PrimaryButton label={t("guard.login")} onPress={() => router.push("/login")} />
        </Card>
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen>
        <Card>
          <Kicker>{t("learn.kicker")}</Kicker>
          <Title>{t("learn.empty.title")}</Title>
          <Body>{t("learn.empty.body")}</Body>
          <PrimaryButton label={t("learn.takeDiag")} onPress={() => router.push("/learning/diagnostics")} />
          <SecondaryButton label={t("learn.classLink")} onPress={() => router.push("/learning/class")} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Kicker>{t("learn.kicker")}</Kicker>
        <Title>{t("learn.title")}</Title>
        <Body>{t("learn.desc")}</Body>
        <Body>
          {t("learn.grade", { n: profile.grade })} · {subject?.title} · {profile.goals.map((g) => t(`goal.${g}`)).join(", ")}
        </Body>
        {state.diagnostic ? <Body>{t("learn.levelPill", { label: t(`level.${state.diagnostic.level}`) })}</Body> : null}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Stat value={`${summary.mastery}%`} label={t("learn.mastery")} />
          <Stat value={summary.accuracy == null ? "—" : `${summary.accuracy}%`} label={t("learn.accuracy")} />
        </View>
        <PrimaryButton label={t("learn.classLink")} onPress={() => router.push("/learning/class")} />
        <SecondaryButton label={t("learn.clips")} onPress={() => router.push("/learning/clips")} />
        <SecondaryButton label={t("learn.takeDiag")} onPress={() => router.push("/learning/diagnostics")} />
      </Card>

      <Card>
        <Title>{t("learn.recs")}</Title>
        <Body>{t("learn.recsHint")}</Body>
        {recs.length === 0 ? <Body>{t("learn.noTopics")}</Body> : null}
        {recs.map((item) => {
          const topic = locale === "kk" ? localizeTopic(item.topic, "kk") : item.topic;
          return (
            <Card key={item.topic.id} style={{ padding: 12 }}>
              <Kicker>{t(`priority.${item.priority}`)}</Kicker>
              <Title>{topic.title}</Title>
              {videoClipFor(item.topic.id, locale === "kk" ? "kk" : "ru") ? (
                <Chip label={t("clips.badge")} selected={false} onPress={() => router.push(`/learning/topic/${item.topic.id}`)} />
              ) : null}
              <Body>{t("learn.why", { reason: whyThisTopic(item, weak, locale) })}</Body>
              <Body>{t("learn.masteredPct", { n: item.mastery })}</Body>
              <PrimaryButton label={t("learn.openTopic")} onPress={() => router.push(`/learning/topic/${item.topic.id}`)} />
            </Card>
          );
        })}
      </Card>

      <Card>
        <Title>{t("learn.weak")}</Title>
        <Body>{t("learn.weakHint")}</Body>
        {weak.length === 0 ? <Body>{t("learn.weakEmpty")}</Body> : null}
        {weak.map((item) => (
          <Card key={item.skill} style={{ padding: 12 }}>
            <Title>{item.skill}</Title>
            <Body>{item.topicTitle} · {item.accuracy}%</Body>
            {item.topicId && videoClipFor(item.topicId, locale === "kk" ? "kk" : "ru") ? (
              <Chip label={t("clips.badge")} selected={false} onPress={() => router.push(`/learning/topic/${item.topicId}`)} />
            ) : null}
            <PrimaryButton label={t("learn.drill")} onPress={() => router.push(`/learning/topic/${item.topicId}`)} />
          </Card>
        ))}
      </Card>

      <Card>
        <Title>{t("learn.plan")}</Title>
        <Body>{planHeadline ?? t("learn.planSoon")}</Body>
        {planSource ? <Kicker>{planSource === "ai" ? t("learn.planAi") : t("learn.planLocal")}</Kicker> : null}
        {localPlan?.weeks.map((week) => (
          <Body key={week.index}>{t("learn.week", { n: week.index })} · {week.title}</Body>
        ))}
      </Card>

      <Card>
        <Title>{t("learn.srs")}</Title>
        <Body>{t("learn.srsHint")}</Body>
        {reviews.length === 0 ? <Body>{t("learn.srsEmpty")}</Body> : null}
        {reviews.map((item) => (
          <View key={item.topic.id} style={{ gap: 6 }}>
            <Body>
              {item.topic.title} · {t("learn.srsMeta", { n: item.intervalDays, date: String(item.daysSince) })}
            </Body>
            {videoClipFor(item.topic.id, locale === "kk" ? "kk" : "ru") ? (
              <Chip label={t("clips.badge")} selected={false} onPress={() => router.push(`/learning/topic/${item.topic.id}`)} />
            ) : null}
          </View>
        ))}
      </Card>
    </Screen>
  );
}
