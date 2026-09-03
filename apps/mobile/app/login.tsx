import { useRouter } from "expo-router";
import { useState } from "react";
import { Screen } from "../src/components/Screen";
import { Body, Card, ErrorText, Field, Kicker, PrimaryButton, SecondaryButton, Title } from "../src/components/ui";
import { useAuth } from "../src/context/AuthContext";
import { useI18n } from "../src/context/I18nContext";
import { isSupabaseConfigured } from "../src/lib/env";
import { cabinetPathForRole } from "../src/lib/site-nav";

export default function LoginScreen() {
  const { t } = useI18n();
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const user = await login({ email, password });
      router.replace((user.role === "student" ? "/learning" : cabinetPathForRole(user.role)) as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Kicker>{t("auth.loginKicker")}</Kicker>
        <Title>{t("auth.loginTitle")}</Title>
        <Body>{t("auth.loginBody")}</Body>
        {!isSupabaseConfigured() ? <Body>{t("auth.localMode")}</Body> : null}
        <Field label={t("auth.email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Field label={t("auth.password")} value={password} onChangeText={setPassword} secureTextEntry placeholder={t("auth.passwordPh")} />
        <ErrorText message={error} />
        <PrimaryButton label={busy ? t("auth.busyLogin") : t("auth.submitLogin")} onPress={submit} busy={busy} />
        <SecondaryButton label={t("auth.goRegister")} onPress={() => router.push("/register")} />
      </Card>
    </Screen>
  );
}
