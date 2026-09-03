import { useEffect, useState } from "react";
import { View } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Screen } from "../../src/components/Screen";
import { Body, Card, Chip, ErrorText, Kicker, PrimaryButton, Title } from "../../src/components/ui";
import { useI18n } from "../../src/context/I18nContext";
import { apiGet } from "../../src/lib/api";
import {
  buildParentReportHtml,
  childDisplayName,
  type ParentReportChild,
} from "../../src/lib/parent/buildParentReportHtml";
import { BRAND } from "@pathwise/shared/brand";

export default function ParentHubScreen() {
  const { t } = useI18n();
  const [children, setChildren] = useState<ParentReportChild[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    void apiGet<{ students?: ParentReportChild[]; data?: ParentReportChild[] }>("/api/students")
      .then((vault) => {
        const list = vault.students ?? vault.data ?? [];
        const next = Array.isArray(list) ? list : [];
        setChildren(next);
        if (next[0]) setActiveId(next[0].id);
      })
      .catch((err) => {
        setChildren([]);
        setError(err instanceof Error ? err.message : t("err.network"));
      });
  }, [t]);

  const child = children.find((item) => item.id === activeId) ?? null;

  async function exportPdf() {
    if (!child) return;
    setError(null);
    setPdfBusy(true);
    try {
      const html = buildParentReportHtml(child, {
        brand: BRAND.productName,
        title: t("parent.report"),
        readonly: t("parent.readonly"),
        profile: t("parent.profile"),
        personal: t("parent.personal"),
        name: t("parent.name"),
        age: t("parent.age"),
        city: t("parent.city"),
        language: t("parent.language"),
        university: t("parent.university"),
        interests: t("parent.interests"),
        achievements: t("parent.achievements"),
        portfolio: t("parent.portfolioBlock"),
        progress: t("parent.progress"),
        mastery: t("learn.mastery"),
        accuracy: t("learn.accuracy"),
        weak: t("learn.weak"),
        career: t("parent.career"),
        finance: t("parent.finance"),
        cost: t("parent.cost"),
        coverage: t("parent.coverage"),
        gap: t("parent.gap"),
        grants: t("nav.grants"),
      });
      const printed = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        setError(t("parent.sharingUnavailable"));
        return;
      }
      await Sharing.shareAsync(printed.uri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: t("parent.exportPdf"),
      });
    } catch {
      setError(t("parent.exportError"));
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Kicker>{t("parent.kicker")}</Kicker>
        <Title>{t("parent.title")}</Title>
        <Body>{t("parent.desc")}</Body>
      </Card>

      <ErrorText message={error} />

      {!children.length ? (
        <Card>
          <Title>{t("parent.noChild")}</Title>
          <Body>{t("parent.empty")}</Body>
          <Body>{t("parent.noApi")}</Body>
        </Card>
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {children.map((item) => (
              <Chip
                key={item.id}
                label={childDisplayName(item)}
                selected={activeId === item.id}
                onPress={() => setActiveId(item.id)}
              />
            ))}
          </View>
          {child ? (
            <>
              <Card>
                <Kicker>{t("parent.readonly")}</Kicker>
                <Title>{t("parent.profile")}</Title>
                <Body>{childDisplayName(child)}</Body>
                {child.age ? <Body>{String(child.age)}</Body> : null}
                {child.city ? <Body>{child.city}</Body> : null}
                {child.target_university ? <Body>{child.target_university}</Body> : null}
                {child.interests?.length ? <Body>{child.interests.join(", ")}</Body> : null}
                <PrimaryButton
                  label={pdfBusy ? t("parent.exportBusy") : t("parent.exportPdf")}
                  onPress={() => void exportPdf()}
                  busy={pdfBusy}
                />
              </Card>
              <Card>
                <Title>{t("parent.progress")}</Title>
                <Body>
                  {t("learn.mastery")} {child.snapshot?.mastery ?? "—"}% · {t("learn.accuracy")}{" "}
                  {child.snapshot?.accuracy ?? "—"}%
                </Body>
                <Body>{t("learn.weak")}: {(child.snapshot?.weakTopics ?? []).join(", ") || "—"}</Body>
              </Card>
              <Card>
                <Title>{t("parent.report")}</Title>
                <Body>{child.primaryCareerTitle || t("parent.empty")}</Body>
                {child.achievements?.map((item) => (
                  <Body key={item}>{item}</Body>
                ))}
                {child.portfolio_block ? <Body>{child.portfolio_block}</Body> : null}
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
