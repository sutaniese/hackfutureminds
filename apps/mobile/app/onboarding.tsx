import { canShowUniversityLayer, nextOnboardingStepIndex } from "@pathwise/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../src/components/Screen";
import { Body, Card, Chip, Field, Kicker, PrimaryButton, SecondaryButton, Title } from "../src/components/ui";
import { useI18n } from "../src/context/I18nContext";
import { useLearning } from "../src/context/LearningContext";
import { apiPost } from "../src/lib/api";
import { writeJson } from "../src/lib/storage";
import { ONBOARDING_SUBJECT_OPTIONS, WORK_OPTIONS } from "../src/lib/onboarding-constants";
import { createEmptyAnswers, type StudyLocation, type WorkPreference } from "../src/types/onboarding";
import type { GenerateResponse } from "../src/types/generate";

export default function OnboardingScreen() {
  const { t, locale } = useI18n();
  const { profile, state } = useLearning();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState(createEmptyAnswers());
  const [busy, setBusy] = useState(false);
  const grade = profile?.grade;
  const allowUniversity = canShowUniversityLayer(grade, state.diagnostic);
  const isLast = nextOnboardingStepIndex(step - 1, allowUniversity ? grade : 8, 1) > 6;

  if (!allowUniversity) {
    return (
      <Screen>
        <Card>
          <Kicker>{t("nav.onboarding")}</Kicker>
          <Title>{profile?.grade && Number(profile.grade) < 10 ? t("guard.grade.title") : t("guard.diag.title")}</Title>
          <Body>{profile?.grade && Number(profile.grade) < 10 ? t("guard.grade.body") : t("guard.diag.body")}</Body>
          <PrimaryButton label={t("learn.takeDiag")} onPress={() => router.replace("/learning/diagnostics")} />
        </Card>
      </Screen>
    );
  }

  async function finish() {
    setBusy(true);
    try {
      const payload = allowUniversity || answers.studyLocation
        ? answers
        : { ...answers, studyLocation: "kazakhstan" as const };
      const data = await apiPost<GenerateResponse>("/api/generate", {
        interests: payload.subjectIds,
        achievements: payload.achievements.split("\n").filter(Boolean),
        target_university: "",
        city: payload.city,
        budget_monthly: Number(payload.budgetConstraints.replace(/\D/g, "")) || 0,
        language: locale,
        onboarding: payload,
      });
      writeJson("ten-onboarding-answers", payload);
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
        <Kicker>{t("nav.onboarding")} · {step}/{allowUniversity ? 7 : 5}</Kicker>
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
          {step > 1 ? (
            <SecondaryButton
              label={t("diag.back")}
              onPress={() => {
                const prev = nextOnboardingStepIndex(step - 1, allowUniversity ? grade : 8, -1);
                if (prev >= 0) setStep(prev + 1);
              }}
            />
          ) : null}
          <View style={{ flex: 1 }}>
            {isLast ? (
              <PrimaryButton label={t("onboard.finish")} onPress={finish} busy={busy} />
            ) : (
              <PrimaryButton
                label={t("onboard.continue")}
                onPress={() => setStep(nextOnboardingStepIndex(step - 1, allowUniversity ? grade : 8, 1) + 1)}
              />
            )}
          </View>
        </View>
        <Body>{t("roadmap.needOnboardHint")}</Body>
      </Card>
    </Screen>
  );
}
