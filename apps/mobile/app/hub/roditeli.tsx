import { useEffect, useState } from "react";
import { Screen } from "../../src/components/Screen";
import { Body, Card, Chip, Kicker, Title } from "../../src/components/ui";
import { useI18n } from "../../src/context/I18nContext";
import { apiGet } from "../../src/lib/api";

type Child = {
  id: string;
  displayName?: string;
  name?: string;
  age?: number;
  city?: string;
  language?: string;
  target_university?: string;
  interests?: string[];
  achievements?: string[];
  primaryCareerTitle?: string;
  snapshot?: { mastery?: number; accuracy?: number; grade?: number; weakTopics?: string[] };
};

export default function ParentHubScreen() {
  const { t } = useI18n();
  const [children, setChildren] = useState<Child[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      apiGet<{ students?: Child[]; data?: Child[] }>("/api/students").catch(() => ({ students: [] })),
      apiGet<{ students?: Child[] }>("/api/class/board").catch(() => ({ students: [] })),
    ])
      .then(([vault, board]) => {
        const list = vault.students ?? vault.data ?? board.students ?? [];
        setChildren(list);
        if (list[0]) setActiveId(list[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t("err.network")));
  }, [t]);

  const child = children.find((item) => item.id === activeId) ?? null;

  return (
    <Screen>
      <Card>
        <Kicker>{t("parent.kicker")}</Kicker>
        <Title>{t("parent.title")}</Title>
        <Body>{t("parent.desc")}</Body>
      </Card>

      {error ? <Card><Body>{error}</Body></Card> : null}

      {!children.length ? (
        <Card>
          <Title>{t("parent.noChild")}</Title>
          <Body>{t("parent.empty")}</Body>
          <Body>{t("parent.noApi")}</Body>
        </Card>
      ) : (
        <>
          {children.map((item) => (
            <Chip
              key={item.id}
              label={item.displayName || item.name || item.id}
              selected={activeId === item.id}
              onPress={() => setActiveId(item.id)}
            />
          ))}
          {child ? (
            <>
              <Card>
                <Kicker>{t("parent.readonly")}</Kicker>
                <Title>{t("parent.profile")}</Title>
                <Body>{child.displayName || child.name}</Body>
                {child.age ? <Body>{child.age}</Body> : null}
                {child.city ? <Body>{child.city}</Body> : null}
                {child.target_university ? <Body>{child.target_university}</Body> : null}
                {child.interests?.length ? <Body>{child.interests.join(", ")}</Body> : null}
              </Card>
              <Card>
                <Title>{t("parent.progress")}</Title>
                <Body>
                  {t("learn.mastery")} {child.snapshot?.mastery ?? "—"}% · {t("learn.accuracy")} {child.snapshot?.accuracy ?? "—"}%
                </Body>
                <Body>{t("learn.weak")}: {(child.snapshot?.weakTopics ?? []).join(", ") || "—"}</Body>
              </Card>
              <Card>
                <Title>{t("parent.report")}</Title>
                <Body>{child.primaryCareerTitle || t("parent.empty")}</Body>
                {child.achievements?.map((item) => (
                  <Body key={item}>{item}</Body>
                ))}
              </Card>
            </>
          ) : (
            <Card>
              <Body>{t("parent.empty")}</Body>
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
