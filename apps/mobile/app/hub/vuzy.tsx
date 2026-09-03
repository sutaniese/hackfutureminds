import { canAccessUniversityLayer } from "@pathwise/shared";
import { useRouter } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Body, Card, Kicker, PrimaryButton, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { useI18n } from "../../src/context/I18nContext";
import { useLearning } from "../../src/context/LearningContext";

const UNIVERSITIES = [
  { id: "nu", name: "Nazarbayev University", city: "Astana" },
  { id: "kimep", name: "KIMEP University", city: "Almaty" },
  { id: "mnu", name: "Maqsut Narikbayev University", city: "Astana" },
  { id: "sdu", name: "SDU University", city: "Kaskelen" },
  { id: "kaznu", name: "Al-Farabi Kazakh National University", city: "Almaty" },
  { id: "satbayev", name: "Satbayev University", city: "Almaty" },
  { id: "kbtu", name: "Kazakh-British Technical University", city: "Almaty" },
  { id: "aitu", name: "Astana IT University", city: "Astana" },
  { id: "enu", name: "L.N. Gumilyov Eurasian National University", city: "Astana" },
  { id: "iitu", name: "International Information Technology University", city: "Almaty" },
];

export default function UniversitiesScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useLearning();
  if (user?.role === "student" && !canAccessUniversityLayer(profile?.grade)) {
    return (
      <Screen>
        <Card>
          <Kicker>{t("uni.kicker")}</Kicker>
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
        <Kicker>{t("uni.kicker")}</Kicker>
        <Title>{t("uni.title")}</Title>
      </Card>
      {UNIVERSITIES.map((item) => (
        <Card key={item.id}>
          <Title>{item.name}</Title>
          <Body>{item.city}</Body>
        </Card>
      ))}
    </Screen>
  );
}
