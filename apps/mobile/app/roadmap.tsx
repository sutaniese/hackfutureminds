import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../src/components/Screen";
import { RoadmapGraph, RoadmapProgressRail, roadmapTone } from "../src/components/RoadmapGraph";
import { Body, Card, Kicker, PrimaryButton, SecondaryButton, Title } from "../src/components/ui";
import { useI18n } from "../src/context/I18nContext";
import { useLearning } from "../src/context/LearningContext";
import { subjectTitle } from "../src/lib/learning/catalog";
import { resolveActiveLearningGoal } from "../src/lib/learning/goal-priority";
import {
  buildPersonalRoadmap,
  goalTitleFor,
  inferTrack,
  readinessScore,
} from "../src/lib/roadmap/personalRoadmap";
import { readTargetUniversity } from "../src/portal/lib/targetUniversity";
import { readJson } from "../src/lib/storage";
import type { GenerateResponse } from "../src/types/generate";
import type { OnboardingAnswers } from "../src/types/onboarding";

function isGapNode(id: string): boolean {
  return id === "gaps" || id.includes("gap") || id.includes("diag");
}

export default function RoadmapScreen() {
  const { t, locale, palette } = useI18n();
  const { profile, state } = useLearning();
  const router = useRouter();
  const [activeId, setActiveId] = useState("vision");
  const answers = readJson<OnboardingAnswers | null>("ten-onboarding-answers", null);
  const generated = readJson<GenerateResponse | null>("ten-generate-response", null);
  const goal = resolveActiveLearningGoal(profile, answers);
  const diagnostic = state.diagnostic;
  const nodes = useMemo(
    () =>
      buildPersonalRoadmap({
        answers,
        diagnostic,
        profile,
        generated,
        targetUniversity: readTargetUniversity(),
        locale,
      }),
    [answers, diagnostic, generated, locale, profile],
  );
  const track = useMemo(
    () => inferTrack(answers, diagnostic, generated, locale, goal),
    [answers, diagnostic, generated, goal, locale],
  );
  const ready = readinessScore({
    answers,
    diagnostic,
    profile,
    generated,
  });
  const subject = diagnostic
    ? subjectTitle(diagnostic.subjectId)
    : profile
      ? subjectTitle(profile.subjectId)
      : t("roadmap.subject.none");
  const active = nodes.find((node) => node.id === activeId) ?? nodes[0];
  const tone = active ? roadmapTone(active.tone) : null;
  const railValue = active
    ? Math.min(100, ready + nodes.findIndex((node) => node.id === active.id) * 4)
    : ready;

  return (
    <Screen>
      <Card>
        <Kicker>{t("roadmap.kicker")}</Kicker>
        <Title>{t("roadmap.title")}</Title>
        <Body>{t("roadmap.desc")}</Body>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(
            [
              [t("roadmap.goal"), goalTitleFor(locale, goal)],
              [t("roadmap.subject"), subject],
              [t("roadmap.ready"), `${ready}%`],
            ] as const
          ).map(([label, value]) => (
            <View
              key={label}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: palette.border,
                borderRadius: 16,
                paddingHorizontal: 10,
                paddingVertical: 10,
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "800", color: palette.muted, textTransform: "uppercase" }}>
                {label}
              </Text>
              <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: "800", color: palette.ink }}>
                {value}
              </Text>
            </View>
          ))}
        </View>
        <Body>{track.label}</Body>
      </Card>

      {!answers && !profile ? (
        <Card>
          <Title>{t("roadmap.needOnboard")}</Title>
          <Body>{t("roadmap.needOnboardHint")}</Body>
          <PrimaryButton label={t("roadmap.fill")} onPress={() => router.push("/onboarding")} />
        </Card>
      ) : null}

      <RoadmapGraph nodes={nodes} activeId={active?.id ?? "vision"} onSelect={setActiveId} />

      {active && tone ? (
        <Card>
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: tone.soft,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: tone.text, fontSize: 11, fontWeight: "800" }}>{active.phase}</Text>
          </View>
          <Title>{active.title}</Title>
          <Text style={{ color: palette.primary, fontSize: 14, fontWeight: "700" }}>{active.subtitle}</Text>
          <Body>{active.detail}</Body>
          <Kicker>{active.metric}</Kicker>
          <RoadmapProgressRail value={railValue} tone={active.tone} />
          {isGapNode(active.id) ? (
            <SecondaryButton
              label={t("learn.takeDiag")}
              onPress={() => router.push("/learning/diagnostics")}
            />
          ) : null}
        </Card>
      ) : null}

      {active ? (
        <Card>
          <Kicker>{t("roadmap.next")}</Kicker>
          {active.actions.map((action, index) => (
            <View
              key={action}
              style={{
                flexDirection: "row",
                gap: 10,
                alignItems: "flex-start",
                borderWidth: 1,
                borderColor: palette.border,
                borderRadius: 16,
                padding: 12,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: palette.accentSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: palette.primary, fontWeight: "800", fontSize: 12 }}>{index + 1}</Text>
              </View>
              <Body style={{ flex: 1 }}>{action}</Body>
            </View>
          ))}
        </Card>
      ) : null}

      <View style={{ gap: 10 }}>
        {nodes.slice(1, 4).map((node) => {
          const pickTone = roadmapTone(node.tone);
          return (
            <Pressable
              key={node.id}
              accessibilityRole="button"
              onPress={() => setActiveId(node.id)}
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
                borderWidth: 1,
                borderRadius: 22,
                padding: 16,
                gap: 8,
              }}
            >
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: pickTone.soft,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: pickTone.text, fontSize: 11, fontWeight: "800" }}>{node.phase}</Text>
              </View>
              <Text style={{ color: palette.ink, fontSize: 18, fontWeight: "800" }}>{node.title}</Text>
              <Body>{node.subtitle}</Body>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
