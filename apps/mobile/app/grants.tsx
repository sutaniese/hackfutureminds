import { canAccessUniversityLayer } from "@pathwise/shared";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking } from "react-native";
import { Screen } from "../src/components/Screen";
import { Body, Card, Kicker, PrimaryButton, Title } from "../src/components/ui";
import { useI18n } from "../src/context/I18nContext";
import { useLearning } from "../src/context/LearningContext";
import { apiGet } from "../src/lib/api";

type Grant = {
  id?: string;
  name: string;
  deadline?: string;
  url?: string;
  suggestedMatchBlurb?: string;
  amountNarrative?: string | null;
};

export default function GrantsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { profile } = useLearning();
  const [grants, setGrants] = useState<Grant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const allowUniversity = canAccessUniversityLayer(profile?.grade);

  useEffect(() => {
    if (!allowUniversity) return;
    void apiGet<{ data?: Grant[] }>("/api/v1/grants")
      .then((res) => setGrants(res.data ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : t("err.network")));
  }, [allowUniversity, t]);

  if (!allowUniversity) {
    return (
      <Screen>
        <Card>
          <Kicker>{t("nav.grants")}</Kicker>
          <Title>{t("guard.grade.title")}</Title>
          <Body>{t("guard.grade.body")}</Body>
          <PrimaryButton label={t("guard.grade.cta")} onPress={() => router.replace("/learning")} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Kicker>{t("nav.grants")}</Kicker>
        <Title>{t("nav.grants")}</Title>
        <Body>{t("home.landing.ctaGrants")}</Body>
      </Card>
      {error ? <Card><Body>{error}</Body></Card> : null}
      {!error && grants.length === 0 ? (
        <Card>
          <Body>{t("grants.empty")}</Body>
        </Card>
      ) : null}
      {grants.slice(0, 20).map((item) => (
        <Card key={item.id ?? item.name}>
          <Title>{item.name}</Title>
          {item.deadline ? <Body>{item.deadline}</Body> : null}
          {item.amountNarrative ? <Body>{item.amountNarrative}</Body> : null}
          {item.suggestedMatchBlurb ? <Body>{item.suggestedMatchBlurb}</Body> : null}
          {item.url ? (
            <PrimaryButton label={item.url} onPress={() => void Linking.openURL(item.url!)} />
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
