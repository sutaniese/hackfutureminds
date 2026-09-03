import { Screen } from "../../src/components/Screen";
import { Body, Card, Kicker, Title } from "../../src/components/ui";
import { useI18n } from "../../src/context/I18nContext";

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
