import * as Speech from "expo-speech";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import { useI18n } from "../context/I18nContext";
import { tap } from "../lib/theme";

export function SpeakButton({ text, label }: { text: string; label?: string }) {
  const { t, locale, palette } = useI18n();
  const [speaking, setSpeaking] = useState(false);
  const lang = locale === "kk" ? "kk-KZ" : locale === "en" ? "en-US" : "ru-RU";

  function toggle() {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    Speech.speak(text, {
      language: lang,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      style={{
        minHeight: tap,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.accentSoft,
      }}
    >
      <Text style={{ fontWeight: "700", color: palette.primary }}>
        {speaking ? t("speak.stop") : label ?? t("clips.listen")}
      </Text>
    </Pressable>
  );
}
