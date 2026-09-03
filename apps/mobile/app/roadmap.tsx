import { useRouter } from "expo-router";
import { Pressable } from "react-native";
import { Screen } from "../src/components/Screen";
import { Body, Card, Kicker, PrimaryButton, Title } from "../src/components/ui";
import { useI18n } from "../src/context/I18nContext";
import { useLearning } from "../src/context/LearningContext";
import { resolveActiveLearningGoal } from "../src/lib/learning/goal-priority";
import { buildPersonalRoadmap, goalTitleFor, readinessScore } from "../src/lib/roadmap/personalRoadmap";
import { readTargetUniversity } from "../src/portal/lib/targetUniversity";
import { readJson } from "../src/lib/storage";
import type { GenerateResponse } from "../src/types/generate";
import type { OnboardingAnswers } from "../src/types/onboarding";

const TONE: Record<string, string> = {
  purple: "#6C63FF",
  green: "#43D19E",
  red: "#FF6B6B",
  slate: "#64748B",
};

export default function RoadmapScreen() {
  const { t, locale, palette } = useI18n();
  const { profile, state } = useLearning();
  const router = useRouter();
  const answers = readJson<OnboardingAnswers | null>("ten-onboarding-answers", null);
  const generated = readJson<GenerateResponse | null>("ten-generate-response", null);
  const goal = resolveActiveLearningGoal(profile, answers);
  const nodes = buildPersonalRoadmap({
    answers,
    diagnostic: state.diagnostic,
    profile,
    generated,
    targetUniversity: readTargetUniversity(),
    locale,
  });
  const ready = readinessScore({
    answers,
    diagnostic: state.diagnostic,
    profile,
    generated,
  });

  return (
    <Screen>
      <Card>
        <Kicker>{t("roadmap.kicker")}</Kicker>
        <Title>{t("roadmap.title")}</Title>
        <Body>{t("roadmap.desc")}</Body>
        <Body>{t("roadmap.goal")}: {goalTitleFor(locale, goal)}</Body>
        <Body>{t("roadmap.ready")}: {ready}%</Body>
      </Card>

      {!answers && !profile ? (
        <Card>
          <Title>{t("roadmap.needOnboard")}</Title>
          <Body>{t("roadmap.needOnboardHint")}</Body>
          <PrimaryButton label={t("roadmap.fill")} onPress={() => router.push("/onboarding")} />
        </Card>
      ) : null}

      {nodes.map((node) => (
        <Pressable
          key={node.id}
          onPress={() => {
            if (node.id.includes("gap") || node.id.includes("diag")) router.push("/learning/diagnostics");
          }}
          style={{
            backgroundColor: palette.surface,
            borderColor: TONE[node.tone] ?? palette.border,
            borderWidth: 2,
            borderRadius: 22,
            padding: 16,
            gap: 6,
          }}
        >
          <Kicker>{node.phase}</Kicker>
          <Title>{node.title}</Title>
          <Body>{node.subtitle}</Body>
          <Body>{node.detail}</Body>
          {node.actions.map((action) => (
            <Body key={action}>• {action}</Body>
          ))}
          <Body>{node.metric}</Body>
        </Pressable>
      ))}
    </Screen>
  );
}
