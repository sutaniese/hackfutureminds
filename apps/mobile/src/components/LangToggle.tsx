import { Pressable, Text, View } from "react-native";
import { useI18n } from "../context/I18nContext";
import type { Locale } from "../i18n/locales";
import { LOCALES } from "../i18n/locales";
import { tap } from "../lib/theme";

export function LangToggle() {
  const { locale, setLocale, t, palette, toggleContrast, highContrast } = useI18n();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <View
        accessibilityRole="tablist"
        accessibilityLabel={t("lang.aria")}
        style={{
          flexDirection: "row",
          borderRadius: 999,
          borderWidth: 1,
          borderColor: palette.border,
          overflow: "hidden",
          backgroundColor: palette.surface,
        }}
      >
        {LOCALES.map((item: Locale) => {
          const active = item === locale;
          return (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setLocale(item)}
              style={{
                minHeight: tap,
                minWidth: tap,
                paddingHorizontal: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? palette.primary : "transparent",
              }}
            >
              <Text style={{ fontWeight: "800", fontSize: 12, color: active ? palette.primaryFg : palette.ink }}>
                {t(`lang.${item}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={toggleContrast}
        accessibilityRole="button"
        style={{
          minHeight: tap,
          paddingHorizontal: 12,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: palette.border,
          justifyContent: "center",
          backgroundColor: palette.surface,
        }}
      >
        <Text style={{ fontWeight: "700", fontSize: 12, color: palette.ink }}>
          {highContrast ? t("contrast.on") : t("contrast.off")}
        </Text>
      </Pressable>
    </View>
  );
}
