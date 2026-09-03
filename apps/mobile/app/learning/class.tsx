import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Screen } from "../../src/components/Screen";
import { Body, Card, ErrorText, Field, Kicker, PrimaryButton, SecondaryButton, Title } from "../../src/components/ui";
import { useAuth } from "../../src/context/AuthContext";
import { useI18n } from "../../src/context/I18nContext";
import { useLearning } from "../../src/context/LearningContext";
import { apiGet, apiPost } from "../../src/lib/api";
import { isSupabaseConfigured } from "../../src/lib/env";
import type { StudentClassOverview } from "../../src/lib/learning/class-overview";
import { previewInvite, readLocalClassJoin, saveLocalClassJoin } from "../../src/lib/learning/class-local";
import { isInviteCodeFormat, normalizeInviteCode } from "../../src/lib/learning/invite";
import { findLocalClassByInvite, addLocalStudent } from "../../src/lib/teacher-local";

export default function ClassScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { profile } = useLearning();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [overview, setOverview] = useState<StudentClassOverview | null>(null);
  const [localNote, setLocalNote] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void apiGet<StudentClassOverview>("/api/learning/class")
      .then(setOverview)
      .catch(() => {
        const local = readLocalClassJoin();
        if (!local) return;
        setOverview({
          configured: !local.localOnly,
          class: {
            id: local.classId,
            name: local.name,
            inviteCode: local.inviteCode,
            teacherName: local.teacherName ?? null,
          },
          memberCount: 1,
          classmates: [],
          homework: [],
          exams: profile?.examDate ? [{ title: profile.examDate, date: profile.examDate, source: "profile" }] : [],
        });
      });
  }, [user, profile?.examDate]);

  async function join() {
    setError(null);
    setLocalNote(null);
    const invite = normalizeInviteCode(previewInvite(code));
    if (!isInviteCodeFormat(invite)) {
      setError(t("class.joinFail"));
      return;
    }
    setBusy(true);
    try {
      if (isSupabaseConfigured()) {
        const data = await apiPost<{ class: { id: string; name: string; inviteCode: string } }>("/api/classes/join", {
          inviteCode: invite,
        });
        saveLocalClassJoin({
          inviteCode: data.class.inviteCode.startsWith("TN-") ? data.class.inviteCode : `TN-${data.class.inviteCode}`,
          name: data.class.name,
          classId: data.class.id,
          localOnly: false,
        });
        const fresh = await apiGet<StudentClassOverview>("/api/learning/class").catch(() => null);
        if (fresh) setOverview(fresh);
      } else {
        const localClass = findLocalClassByInvite(invite);
        saveLocalClassJoin({
          inviteCode: invite,
          name: localClass?.name ?? invite,
          classId: localClass?.id,
          teacherName: localClass?.teacherName,
          localOnly: true,
        });
        if (localClass && user) addLocalStudent(localClass.id, user.email);
        setLocalNote(t("class.localSaved", { code: invite }));
        setOverview({
          configured: false,
          class: {
            id: localClass?.id ?? `local:${invite}`,
            name: localClass?.name ?? invite,
            inviteCode: invite,
            teacherName: localClass?.teacherName ?? null,
          },
          memberCount: localClass?.studentIds.length ?? 1,
          classmates: [],
          homework: [],
          exams: profile?.examDate ? [{ title: profile.examDate, date: profile.examDate, source: "profile" }] : [],
        });
      }
    } catch (err) {
      const localClass = findLocalClassByInvite(invite);
      saveLocalClassJoin({
        inviteCode: invite,
        name: localClass?.name ?? invite,
        classId: localClass?.id,
        teacherName: localClass?.teacherName,
        localOnly: true,
      });
      setLocalNote(t("class.needsServer"));
      setError(err instanceof Error ? err.message : t("class.joinFail"));
    } finally {
      setBusy(false);
    }
  }

  const joined = overview?.class;

  return (
    <Screen>
      <Card>
        <Kicker>{t("class.kicker")}</Kicker>
        <Title>{t("class.title")}</Title>
        <Body>{t("class.desc")}</Body>
      </Card>

      <Card>
        <Title>{t("class.codeTitle")}</Title>
        <Body>{t("class.codeHint")}</Body>
        <Field
          label={t("class.aria")}
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase())}
          placeholder={t("class.placeholder")}
          autoCapitalize="characters"
        />
        <ErrorText message={error} />
        {localNote ? <Body>{localNote}</Body> : null}
        <PrimaryButton label={busy ? t("class.joining") : t("class.join")} onPress={join} busy={busy} />
      </Card>

      {joined ? (
        <Card>
          <Kicker>{t("class.teacherClass")}</Kicker>
          <Title>{joined.name}</Title>
          <Body>{t("class.name")}: {joined.name}</Body>
          <Body>{t("class.teacher")}: {joined.teacherName || t("class.teacherUnknown")}</Body>
          <Body>{t("class.invite")}: {joined.inviteCode.startsWith("TN-") ? joined.inviteCode : `TN-${joined.inviteCode}`}</Body>
          <Body>{t("class.matesCount", { n: overview?.memberCount ?? 1 })}</Body>
          <PrimaryButton
            label={copied ? t("class.copied") : t("class.copy")}
            onPress={async () => {
              await Clipboard.setStringAsync(joined.inviteCode.startsWith("TN-") ? joined.inviteCode : `TN-${joined.inviteCode}`);
              setCopied(true);
            }}
          />
        </Card>
      ) : (
        <Card>
          <Title>{t("class.notIn")}</Title>
        </Card>
      )}

      <Card>
        <Title>{t("class.homework")}</Title>
        <Body>{t("class.homeworkHint")}</Body>
        {!overview?.homework.length ? <Body>{t("class.hwEmpty")}</Body> : null}
        {overview?.homework.map((item) => (
          <Body key={item.id}>
            {item.title} · {t(item.status === "done" ? "class.hwDone" : item.status === "in_progress" ? "class.hwDoing" : "class.hwAssigned")}
          </Body>
        ))}
      </Card>

      <Card>
        <Title>{t("class.exams")}</Title>
        {!overview?.exams.length ? <Body>{t("class.examEmpty")}</Body> : null}
        {overview?.exams.map((item) => (
          <Body key={`${item.title}-${item.date}`}>{item.title} · {item.source === "profile" ? t("class.examProfile") : t("class.examTeacher")}</Body>
        ))}
      </Card>

      <SecondaryButton label={t("class.toClips")} onPress={() => router.push("/learning/clips")} />
      <SecondaryButton label={t("class.toLearn")} onPress={() => router.push("/learning")} />
    </Screen>
  );
}
