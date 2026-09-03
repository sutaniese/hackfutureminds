import { Stack, usePathname } from "expo-router";
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

/** Hide bottom nav during focused single-screen flows. */
function NavGuard() {
  const pathname = usePathname();
  const hiddenRoutes = ["/learning/diagnostics"];
  if (hiddenRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return null;
  }
  return <RoleTabs />;
}

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
            <NavGuard />
          </LearningProvider>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
