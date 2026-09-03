import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../src/components/Screen";
import { Body, Card, Chip, Field, Kicker, PrimaryButton, SecondaryButton, Title } from "../src/components/ui";
import { useI18n } from "../src/context/I18nContext";
import { apiPost } from "../src/lib/api";
import { writeJson } from "../src/lib/storage";
import { ONBOARDING_SUBJECT_OPTIONS, WORK_OPTIONS } from "../src/lib/onboarding-constants";
import { createEmptyAnswers, type StudyLocation, type WorkPreference } from "../src/types/onboarding";
import type { GenerateResponse } from "../src/types/generate";

export default function OnboardingScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState(createEmptyAnswers());
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    try {
      const data = await apiPost<GenerateResponse>("/api/generate", {
        interests: answers.subjectIds,
        achievements: answers.achievements.split("\n").filter(Boolean),
        target_university: "",
        city: answers.city,
        budget_monthly: Number(answers.budgetConstraints.replace(/\D/g, "")) || 0,
        language: locale,
        onboarding: answers,
      });
      writeJson("ten-onboarding-answers", answers);
      writeJson("ten-generate-response", data);
      router.replace("/results");
    } catch {
      writeJson("ten-onboarding-answers", answers);
      router.replace("/results");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Kicker>{t("nav.onboarding")} · {step}/7</Kicker>
        {step === 1 ? (
          <>
            <Title>{t("onboard.q1")}</Title>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {ONBOARDING_SUBJECT_OPTIONS.map((item) => (
                <Chip
                  key={item.id}
                  label={t(`onboard.subjects.${item.id}`) === `onboard.subjects.${item.id}` ? item.label : t(`onboard.subjects.${item.id}`)}
                  selected={answers.subjectIds.includes(item.id)}
                  onPress={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      subjectIds: prev.subjectIds.includes(item.id)
                        ? prev.subjectIds.filter((id) => id !== item.id)
                        : [...prev.subjectIds, item.id],
                    }))
                  }
                />
              ))}
            </View>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <Title>{t("onboard.q2")}</Title>
            <Field label={t("onboard.q2")} value={answers.freeTime} onChangeText={(freeTime) => setAnswers((p) => ({ ...p, freeTime }))} />
          </>
        ) : null}
        {step === 3 ? (
          <>
            <Title>{t("onboard.q3")}</Title>
            <Field label={t("onboard.q3")} value={answers.achievements} onChangeText={(achievements) => setAnswers((p) => ({ ...p, achievements }))} />
          </>
        ) : null}
        {step === 4 ? (
          <>
            <Title>{t("onboard.q4")}</Title>
            {WORK_OPTIONS.map((item) => (
              <Chip
                key={item.id}
                label={item.label}
                selected={answers.workPreference === item.id}
                onPress={() => setAnswers((p) => ({ ...p, workPreference: item.id as WorkPreference }))}
              />
            ))}
          </>
        ) : null}
        {step === 5 ? (
          <>
            <Title>{t("onboard.q5")}</Title>
            {(["kazakhstan", "abroad"] as StudyLocation[]).map((item) => (
              <Chip
                key={item}
                label={item === "abroad" ? t("onboard.studyAb") : t("onboard.studyKz")}
                selected={answers.studyLocation === item}
                onPress={() => setAnswers((p) => ({ ...p, studyLocation: item }))}
              />
            ))}
          </>
        ) : null}
        {step === 6 ? (
          <>
            <Title>{t("onboard.q6")}</Title>
            <Field label={t("onboard.q6")} value={answers.city} onChangeText={(city) => setAnswers((p) => ({ ...p, city }))} />
          </>
        ) : null}
        {step === 7 ? (
          <>
            <Title>{t("onboard.q7")}</Title>
            <Field label={t("onboard.q7")} value={answers.budgetConstraints} onChangeText={(budgetConstraints) => setAnswers((p) => ({ ...p, budgetConstraints }))} />
          </>
        ) : null}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {step > 1 ? <SecondaryButton label={t("diag.back")} onPress={() => setStep((n) => n - 1)} /> : null}
          <View style={{ flex: 1 }}>
            {step < 7 ? (
              <PrimaryButton label={t("onboard.continue")} onPress={() => setStep((n) => n + 1)} />
            ) : (
              <PrimaryButton label={t("onboard.finish")} onPress={finish} busy={busy} />
            )}
          </View>
        </View>
        <Body>{t("roadmap.needOnboardHint")}</Body>
      </Card>
    </Screen>
  );
}
