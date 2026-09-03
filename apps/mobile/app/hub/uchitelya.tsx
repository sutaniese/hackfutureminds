import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Screen } from "../../src/components/Screen";
import { Body, Card, ErrorText, Field, Kicker, PrimaryButton, SecondaryButton, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { useI18n } from "../../src/context/I18nContext";
import { apiDelete, apiGet, apiPost } from "../../src/lib/api";
import { isSupabaseConfigured } from "../../src/lib/env";
import { createLocalClass, deleteLocalClass, readLocalClasses, type LocalTeacherClass } from "../../src/lib/teacher-local";

type ServerClass = {
  id: string;
  name: string;
  inviteCode: string;
  studentIds?: string[];
};

export default function TeacherCabinetScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("11«Б» — профориентация");
  const [classes, setClasses] = useState<Array<ServerClass | LocalTeacherClass>>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      if (isSupabaseConfigured()) {
        const data = await apiGet<{ classes: ServerClass[] }>("/api/classes");
        setClasses(Array.isArray(data?.classes) ? data.classes : []);
      } else {
        setClasses(readLocalClasses());
      }
    } catch (err) {
      setClasses(readLocalClasses());
      setError(err instanceof Error ? err.message : t("teacher.loadFail"));
    }
  }

  useEffect(() => {
    void load();
  }, [user?.email]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      if (isSupabaseConfigured()) {
        const data = await apiPost<{ class: ServerClass }>("/api/classes", { name });
        setClasses((prev) => [data.class, ...prev]);
      } else {
        const created = createLocalClass(name, user?.name);
        setClasses((prev) => [created, ...prev]);
      }
    } catch (err) {
      const created = createLocalClass(name, user?.name);
      setClasses((prev) => [created, ...prev]);
      setError(err instanceof Error ? err.message : t("teacher.createFail"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      if (isSupabaseConfigured() && !id.startsWith("local-")) {
        await apiDelete(`/api/classes/${id}`);
      } else {
        deleteLocalClass(id);
      }
    } catch {
      deleteLocalClass(id);
    }
    setClasses((prev) => prev.filter((item) => item.id !== id));
  }

  const active = classes[0];

  return (
    <Screen>
      <Card>
        <Kicker>{t("teacher.pageKicker")}</Kicker>
        <Title>{t("teacher.pageTitle")}</Title>
        <Body>{t("teacher.pageDesc")}</Body>
      </Card>

      <Card>
        <Title>{t("teacher.newClass")}</Title>
        <Field label={t("teacher.className")} value={name} onChangeText={setName} />
        <Body>{t("teacher.createHint")}</Body>
        <ErrorText message={error} />
        <PrimaryButton label={busy ? t("teacher.generating") : t("teacher.create")} onPress={create} busy={busy} />
      </Card>

      {!classes.length ? (
        <Card>
          <Body>{t("teacher.noClasses")}</Body>
          <Body>{t("teacher.inviteEmpty")}</Body>
        </Card>
      ) : (
        classes.map((item) => (
          <Card key={item.id}>
            <Kicker>{t("teacher.current")}</Kicker>
            <Title>{item.name}</Title>
            <Body>{t("teacher.inviteCode")}</Body>
            <Title>{item.inviteCode.startsWith("TN-") ? item.inviteCode : `TN-${item.inviteCode}`}</Title>
            <PrimaryButton
              label={copied ? t("class.copied") : t("teacher.copy")}
              onPress={async () => {
                const code = item.inviteCode.startsWith("TN-") ? item.inviteCode : `TN-${item.inviteCode}`;
                await Clipboard.setStringAsync(code);
                setCopied(true);
              }}
            />
            <SecondaryButton label={t("teacher.delete")} onPress={() => void remove(item.id)} />
            <Body>
              {t("teacher.emptyRoster", {
                code: item.inviteCode.startsWith("TN-") ? item.inviteCode : `TN-${item.inviteCode}`,
              })}
            </Body>
          </Card>
        ))
      )}

      {active ? (
        <Card>
          <Title>{t("teacher.summary")}</Title>
          <Body>{t("board.emptyDemo")}</Body>
          <PrimaryButton label={t("nav.teacherLearn")} onPress={() => router.push("/hub/obuchenie")} />
        </Card>
      ) : null}
    </Screen>
  );
}
