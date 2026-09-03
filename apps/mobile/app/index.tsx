import { useRouter } from "expo-router";
import { View } from "react-native";
import { Body, Card, Kicker, PrimaryButton, SecondaryButton, Title } from "../src/components/ui";
import { Screen } from "../src/components/Screen";
import { useAuth } from "../src/context/AuthContext";
import { useI18n } from "../src/context/I18nContext";
import { useLearning } from "../src/context/LearningContext";
import { nextTask, recommendTopics } from "../src/lib/learning/recommend";
import { cabinetPathForRole } from "../src/lib/site-nav";

export default function HomeScreen() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const { profile, state, topics } = useLearning();
  const router = useRouter();
  const recs = recommendTopics(topics, profile, state, 1);
  const next = recs[0];
  const nextPractice = next ? nextTask(next.topic, state) : null;
  const lastTopicId = state.attempts[0]?.topicId;
  const lastTopic = lastTopicId ? topics.find((item) => item.id === lastTopicId) : null;
  const teacherTopics = topics.filter((item) => item.custom);

  if (user?.role === "teacher") {
    return (
      <Screen>
        <Card>
          <Kicker>{t("role.teacher")}</Kicker>
          <Title>{t("nav.cabinet")}</Title>
          <Body>{t("home.teacher.lead")}</Body>
          <PrimaryButton label={t("nav.teacherLearn")} onPress={() => router.push("/hub/obuchenie")} />
          <SecondaryButton label={t("nav.cabinet")} onPress={() => router.push("/hub/uchitelya")} />
        </Card>
      </Screen>
    );
  }

  if (user?.role === "parent") {
    return (
      <Screen>
        <Card>
          <Kicker>{t("role.parent")}</Kicker>
          <Title>{t("parent.title")}</Title>
          <Body>{t("home.parent.lead")}</Body>
          <PrimaryButton label={t("parent.progress")} onPress={() => router.replace(cabinetPathForRole("parent") as never)} />
        </Card>
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <Card>
          <Kicker>{t("home.landing.kicker")}</Kicker>
          <Title>{t("home.landing.title")}</Title>
          <Body>{t("home.landing.subtitle")}</Body>
          <PrimaryButton label={t("nav.login")} onPress={() => router.push("/login")} />
          <SecondaryButton label={t("nav.register")} onPress={() => router.push("/register")} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Kicker>{t("home.start.kicker")}</Kicker>
        <Title>{t("home.start.title")}</Title>
        {lastTopic ? (
          <PrimaryButton
            label={t("home.start.continue", { title: lastTopic.title })}
            onPress={() => router.push(`/learning/topic/${lastTopic.id}`)}
          />
        ) : (
          <PrimaryButton label={t("learn.takeDiag")} onPress={() => router.push("/learning/diagnostics")} />
        )}
      </Card>

      {next ? (
        <Card>
          <Kicker>{t("learn.recs")}</Kicker>
          <Title>{next.topic.title}</Title>
          <Body>{nextPractice?.prompt ?? next.topic.summary}</Body>
          <PrimaryButton
            label={t("learn.openTopic")}
            onPress={() => router.push(`/learning/topic/${next.topic.id}`)}
          />
        </Card>
      ) : null}

      <Card>
        <Kicker>{t("nav.class")}</Kicker>
        <Title>{t("class.title")}</Title>
        <Body>
          {teacherTopics.length > 0
            ? t("home.class.hw", { n: teacherTopics.length })
            : t("home.class.join")}
        </Body>
        <PrimaryButton label={t("learn.classLink")} onPress={() => router.push("/learning/class")} />
      </Card>

      <View style={{ gap: 10 }}>
        <SecondaryButton label={t("learn.plan")} onPress={() => router.push("/learning")} />
        <SecondaryButton label={t("learn.clips")} onPress={() => router.push("/learning/clips")} />
        <SecondaryButton label={t("nav.logout")} onPress={() => void logout()} />
      </View>
    </Screen>
  );
}
