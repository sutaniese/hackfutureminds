import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { Body, Card, Kicker, PrimaryButton, SecondaryButton, Stat, Title } from "../src/components/ui";
import { Screen } from "../src/components/Screen";
import { useAuth } from "../src/context/AuthContext";
import { useI18n } from "../src/context/I18nContext";
import { cabinetPathForRole } from "../src/lib/site-nav";

export default function HomeScreen() {
  const { t, palette } = useI18n();
  const { user, logout } = useAuth();
  const router = useRouter();

  if (user && user.role !== "student") {
    return (
      <Screen>
        <Card>
          <Kicker>{t("role.kicker", { role: t(`role.${user.role}`) })}</Kicker>
          <Title>{t("nav.cabinet")}</Title>
          <Body>{t("role.sectionsHint")}</Body>
          <PrimaryButton label={t("guard.cabinet")} onPress={() => router.replace(cabinetPathForRole(user.role) as never)} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Kicker>{t("home.landing.kicker")}</Kicker>
        <Title>{t("home.landing.title")}</Title>
        <Body>{t("home.landing.subtitle")}</Body>
        <PrimaryButton
          label={t("home.landing.ctaPrimary")}
          onPress={() => router.push(user ? "/learning" : "/register")}
        />
        <SecondaryButton label={t("home.landing.ctaSecondary")} onPress={() => router.push("/learning/diagnostics")} />
        <SecondaryButton label={t("home.landing.ctaGrants")} onPress={() => router.push("/grants")} />
      </Card>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Stat value={t("home.landing.stat1v")} label={t("home.landing.stat1l")} />
        <Stat value={t("home.landing.stat2v")} label={t("home.landing.stat2l")} />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Stat value={t("home.landing.stat3v")} label={t("home.landing.stat3l")} />
        <Stat value={t("home.landing.stat4v")} label={t("home.landing.stat4l")} />
      </View>

      <Card>
        <Kicker>{t("home.learn.kicker")}</Kicker>
        <Title>{t("home.learn.title")}</Title>
        <Body>{t("home.learn.lead")}</Body>
      </Card>

      {(["student", "parent", "teacher"] as const).map((role) => (
        <Pressable
          key={role}
          onPress={() => router.push(user ? (cabinetPathForRole(role) as never) : ("/register" as never))}
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.border,
            borderWidth: 1,
            borderRadius: 22,
            padding: 16,
            minHeight: 72,
          }}
        >
          <Kicker>{t(`role.${role}`)}</Kicker>
          <Body>{t(`home.role.${role}`)}</Body>
        </Pressable>
      ))}

      {!user ? (
        <View style={{ gap: 10 }}>
          <PrimaryButton label={t("nav.login")} onPress={() => router.push("/login")} />
          <SecondaryButton label={t("nav.register")} onPress={() => router.push("/register")} />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <PrimaryButton label={t("learn.classLink")} onPress={() => router.push("/learning/class")} />
          <SecondaryButton label={t("learn.clips")} onPress={() => router.push("/learning/clips")} />
          <SecondaryButton label={t("nav.logout")} onPress={() => void logout()} />
        </View>
      )}
    </Screen>
  );
}
