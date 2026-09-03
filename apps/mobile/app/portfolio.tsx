import { Screen } from "../src/components/Screen";
import { Body, Card, Kicker, Title } from "../src/components/ui";
import { useAuth } from "../src/context/AuthContext";
import { useI18n } from "../src/context/I18nContext";
import { useLearning } from "../src/context/LearningContext";
import { readJson } from "../src/lib/storage";
import type { GenerateResponse } from "../src/types/generate";
import type { OnboardingAnswers } from "../src/types/onboarding";

export default function PortfolioScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { profile, state } = useLearning();
  const answers = readJson<OnboardingAnswers | null>("ten-onboarding-answers", null);
  const generated = readJson<GenerateResponse | null>("ten-generate-response", null);

  return (
    <Screen>
      <Card>
        <Kicker>{t("nav.portfolio")}</Kicker>
        <Title>{t("nav.portfolio")}</Title>
        <Body>{t("portfolio.body")}</Body>
        <Body>{user?.name || user?.email || "—"}</Body>
        {profile ? <Body>{t("learn.grade", { n: profile.grade })} · {profile.goals.map((g) => t(`goal.${g}`)).join(", ")}</Body> : null}
        {state.diagnostic ? <Body>{t("learn.levelPill", { label: t(`level.${state.diagnostic.level}`) })}</Body> : null}
        {answers?.achievements ? <Body>{answers.achievements}</Body> : null}
        {generated?.portfolio_block ? <Body>{generated.portfolio_block}</Body> : null}
      </Card>
    </Screen>
  );
}
