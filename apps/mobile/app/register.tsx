import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../src/components/Screen";
import { Body, Card, Chip, ErrorText, Field, Kicker, PrimaryButton, SecondaryButton, Title } from "../src/components/ui";
import { useAuth } from "../src/context/AuthContext";
import { useI18n } from "../src/context/I18nContext";
import { isSupabaseConfigured } from "../src/lib/env";
import { cabinetPathForRole, type UserRole } from "../src/lib/site-nav";

const ROLES: UserRole[] = ["student", "parent", "teacher"];

export default function RegisterScreen() {
  const { t } = useI18n();
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const user = await register({ email, password, role, name });
      router.replace((user.role === "student" ? "/setup" : cabinetPathForRole(user.role)) as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Kicker>{t("auth.registerKicker")}</Kicker>
        <Title>{t("auth.registerTitle")}</Title>
        <Body>{t("auth.registerBody")}</Body>
        {!isSupabaseConfigured() ? <Body>{t("auth.localMode")}</Body> : null}
        <Field label={t("auth.name")} value={name} onChangeText={setName} placeholder={t("auth.namePh")} />
        <Field label={t("auth.email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Field label={t("auth.password")} value={password} onChangeText={setPassword} secureTextEntry placeholder={t("auth.passwordPh")} />
        <Body>{t("auth.roleHint")}</Body>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {ROLES.map((item) => (
            <Chip key={item} label={t(`role.${item}`)} selected={role === item} onPress={() => setRole(item)} />
          ))}
        </View>
        <Body>{t(`auth.role.${role}`)}</Body>
        <ErrorText message={error} />
        <PrimaryButton label={busy ? t("auth.busyRegister") : t("auth.submitRegister")} onPress={submit} busy={busy} />
        <SecondaryButton label={t("auth.goLogin")} onPress={() => router.push("/login")} />
      </Card>
    </Screen>
  );
}
