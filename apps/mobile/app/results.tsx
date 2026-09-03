import { useRouter } from "expo-router";
import { Screen } from "../src/components/Screen";
import { Body, Card, Kicker, PrimaryButton, SecondaryButton, Title } from "../src/components/ui";
import { useI18n } from "../src/context/I18nContext";
import { useLearning } from "../src/context/LearningContext";
import { canAccessUniversityLayer } from "@pathwise/shared";
import { resolveActiveLearningGoal, isOlympiadGoal, isSchoolCatchupGoal } from "../src/lib/learning/goal-priority";
import { readJson } from "../src/lib/storage";
import type { GenerateResponse } from "../src/types/generate";
import type { OnboardingAnswers } from "../src/types/onboarding";

export default function ResultsScreen() {
  const { t } = useI18n();
  const { profile } = useLearning();
  const router = useRouter();
  const answers = readJson<OnboardingAnswers | null>("ten-onboarding-answers", null);
  const generated = readJson<GenerateResponse | null>("ten-generate-response", null);
  const goal = resolveActiveLearningGoal(profile, answers);
  const titleKey = isOlympiadGoal(goal)
    ? "results.pageTitle.olympiad"
    : isSchoolCatchupGoal(goal)
      ? "results.pageTitle.school"
      : "results.pageTitle";

  return (
    <Screen>
      <Card>
        <Kicker>{t("results.kicker")}</Kicker>
        <Title>{t(titleKey)}</Title>
        {isOlympiadGoal(goal) ? (
          <Body>{t(canAccessUniversityLayer(profile?.grade) ? "results.sub.olympiad" : "results.sub.olympiad.middle")}</Body>
        ) : null}
        {isSchoolCatchupGoal(goal) ? (
          <Body>{t(canAccessUniversityLayer(profile?.grade) ? "results.sub.school" : "results.sub.school.middle")}</Body>
        ) : null}
        {!generated && !answers ? <Body>{t("results.afterOnboard")}</Body> : null}
      </Card>

      {generated?.career_map?.length ? (
        <Card>
          <Kicker>{t("results.tag.career")}</Kicker>
          {generated.career_map.slice(0, 3).map((item) => (
            <Body key={item.title}>{item.title} · {item.salary_kzt}</Body>
          ))}
        </Card>
      ) : null}

      {canAccessUniversityLayer(profile?.grade) && generated?.financial_route ? (
        <Card>
          <Kicker>{t("results.tag.money")}</Kicker>
          <Body>{generated.financial_route.monthly_cost} ₸ · {generated.financial_route.coverage_percent}%</Body>
        </Card>
      ) : null}

      {generated?.portfolio_block ? (
        <Card>
          <Kicker>{t("results.tag.resume")}</Kicker>
          <Body>{generated.portfolio_block}</Body>
        </Card>
      ) : null}

      <PrimaryButton label={t("results.toLearn")} onPress={() => router.push("/learning")} />
      <SecondaryButton label={t("nav.onboarding")} onPress={() => router.push("/onboarding")} />
    </Screen>
  );
}
