import { useEffect, useState } from "react";
import { Screen } from "../../src/components/Screen";
import { Body, Card, Kicker, Title } from "../../src/components/ui";
import { useI18n } from "../../src/context/I18nContext";
import { apiGet } from "../../src/lib/api";

type StudentRow = {
  id: string;
  displayName?: string;
  name?: string;
  email?: string;
  city?: string;
};

export default function StudentsCrmScreen() {
  const { t } = useI18n();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<{ students?: StudentRow[]; data?: StudentRow[] }>("/api/students")
      .then((data) => {
        const list = data?.students ?? data?.data ?? [];
        setStudents(Array.isArray(list) ? list : []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t("err.network")));
  }, [t]);

  return (
    <Screen>
      <Card>
        <Kicker>{t("students.kicker")}</Kicker>
        <Title>{t("students.title")}</Title>
        <Body>{t("students.desc")}</Body>
      </Card>
      {error ? <Card><Body>{error}</Body></Card> : null}
      {!students.length ? (
        <Card>
          <Body>{t("students.empty")}</Body>
        </Card>
      ) : (
        students.map((item) => (
          <Card key={item.id}>
            <Title>{item.displayName || item.name || item.email || item.id}</Title>
            {item.city ? <Body>{item.city}</Body> : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
