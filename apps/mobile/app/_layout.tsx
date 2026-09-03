import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RoleTabs } from "../src/components/RoleTabs";
import { AuthProvider } from "../src/context/AuthContext";
import { I18nProvider } from "../src/context/I18nContext";
import { LearningProvider } from "../src/context/LearningContext";
import { colors } from "../src/lib/theme";
import { hydrateMemoryStorage } from "../src/lib/storage";

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void hydrateMemoryStorage().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <LearningProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
            <RoleTabs />
          </LearningProvider>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
