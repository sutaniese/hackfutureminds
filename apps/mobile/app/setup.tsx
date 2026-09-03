/**
 * Post-registration setup wizard for students.
 * Steps: grade → class invite code (optional) → diagnostics.
 * Replaces /onboarding (career nav) which is still accessible manually.
 */
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../src/components/Screen";
import { Body, Card, Chip, ErrorText, Field, Kicker, PrimaryButton, SecondaryButton, Title } from "../src/components/ui";
import { useAuth } from "../src/context/AuthContext";
import { useI18n } from "../src/context/I18nContext";
import { apiPost } from "../src/lib/api";
import { isSupabaseConfigured } from "../src/lib/env";
import { previewInvite, readLocalClassJoin, saveLocalClassJoin } from "../src/lib/learning/class-local";
import { isInviteCodeFormat, normalizeInviteCode } from "../src/lib/learning/invite";
import { findLocalClassByInvite, addLocalStudent } from "../src/lib/teacher-local";
import { type Grade } from "../src/lib/learning/types";

const GRADES: Grade[] = [7, 8, 9, 10, 11, 12];

export default function SetupScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();

  const [stage, setStage] = useState<"grade" | "class">("grade");
  const [grade, setGrade] = useState<Grade>(9);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function joinClass() {
    setError(null);
    const invite = normalizeInviteCode(previewInvite(code));
    if (!isInviteCodeFormat(invite)) {
      // Skip if blank — code is optional
      if (code.trim() === "") {
        router.replace("/learning/diagnostics");
        return;
      }
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
      }
    } catch {
      setError(t("class.joinFail"));
    } finally {
      setBusy(false);
    }
    router.replace("/learning/diagnostics");
  }

  function skipClass() {
    router.replace("/learning/diagnostics");
  }

  const joined = readLocalClassJoin();

  return (
    <Screen>
      <Card>
        <Kicker>{t("setup.kicker")}</Kicker>
        <Title>{t("setup.title")}</Title>
        <Body>{t("setup.desc")}</Body>
      </Card>

      {stage === "grade" ? (
        <Card>
          <Title>{t("diag.askGrade")}</Title>
          <Body>{t("diag.hintGrade")}</Body>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {GRADES.map((item) => (
              <Chip key={item} label={String(item)} selected={grade === item} onPress={() => setGrade(item)} />
            ))}
          </View>
          <PrimaryButton label={t("setup.nextClass")} onPress={() => setStage("class")} />
        </Card>
      ) : null}

      {stage === "class" ? (
        <Card>
          <Title>{t("class.codeTitle")}</Title>
          <Body>{t("class.codeHint")}</Body>
          {joined?.inviteCode ? (
            <Body>{t("class.joined", { name: joined.name, code: joined.inviteCode })}</Body>
          ) : null}
          <Field
            label={t("class.aria")}
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            placeholder={t("class.placeholder")}
            autoCapitalize="characters"
          />
          <ErrorText message={error} />
          <PrimaryButton
            label={busy ? t("class.joining") : (code.trim() ? t("class.join") : t("setup.skipClass"))}
            onPress={joinClass}
            busy={busy}
          />
          <SecondaryButton label={t("setup.skipClass")} onPress={skipClass} />
          <SecondaryButton label={t("diag.back")} onPress={() => setStage("grade")} />
        </Card>
      ) : null}
    </Screen>
  );
}
