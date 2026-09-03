import { type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "../context/I18nContext";
import { LangToggle } from "./LangToggle";
import { TenWordmark } from "./ui";

export function Screen({
  children,
  scroll = true,
  paddedBottom = 108,
  hideNav = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  paddedBottom?: number;
  /** Set to true inside diagnostics to suppress the bottom nav padding. */
  hideNav?: boolean;
}) {
  const { palette } = useI18n();
  const inner = (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: hideNav ? 16 : paddedBottom, gap: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <TenWordmark />
        <LangToggle />
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
          style={{ backgroundColor: palette.bg }}
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}
