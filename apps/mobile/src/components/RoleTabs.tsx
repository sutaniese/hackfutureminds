/**
 * RoleTabs — compact bottom navigation bar for the mobile app.
 *
 * For students we show five primary tabs in one row (grade-gated).
 * Any overflow tabs (max 5 primary) are collected behind an «Ещё» modal sheet.
 * For teachers and parents the full list always fits (≤4 tabs).
 *
 * Requirements:
 * • No label truncation at any supported width.
 * • 44pt minimum tap targets.
 * • Bottom safe-area respected.
 * • Hidden on login / register.
 */

import { filterNavLinksForGrade } from "@pathwise/shared";
import { usePathname, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useLearning } from "../context/LearningContext";
import { colors, tap } from "../lib/theme";

type Tab = { href: string; labelKey: string; match?: (path: string) => boolean };

const MAX_PRIMARY = 5;

/** Student tabs (always includes home + learn; others depend on grade). */
const STUDENT_TABS: Tab[] = [
  { href: "/", labelKey: "nav.home", match: (p) => p === "/" },
  { href: "/onboarding", labelKey: "nav.onboarding" },
  {
    href: "/learning",
    labelKey: "nav.learning",
    match: (p) =>
      p === "/learning" ||
      (p.startsWith("/learning/") &&
        !p.startsWith("/learning/class") &&
        !p.startsWith("/learning/clips")),
  },
  { href: "/results", labelKey: "nav.results" },
  { href: "/roadmap", labelKey: "nav.roadmap" },
  { href: "/grants", labelKey: "nav.grants" },
  { href: "/portfolio", labelKey: "nav.portfolio" },
];

const TEACHER_TABS: Tab[] = [
  { href: "/hub/uchitelya", labelKey: "nav.cabinet" },
  { href: "/hub/obuchenie", labelKey: "nav.teacherLearn" },
  { href: "/hub/uchenik", labelKey: "nav.students" },
  { href: "/hub/agent", labelKey: "nav.agent" },
];

const PARENT_TABS: Tab[] = [
  { href: "/hub/roditeli", labelKey: "nav.cabinet" },
  { href: "/hub/agent", labelKey: "nav.agent" },
  { href: "/hub/vuzy", labelKey: "nav.universities" },
];

function isTabActive(tab: Tab, pathname: string): boolean {
  if (tab.match) return tab.match(pathname);
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}

function TabItem({
  tab,
  active,
  palette,
  tFn,
  onPress,
  flex = 1,
}: {
  tab: Tab;
  active: boolean;
  palette: ReturnType<typeof useI18n>["palette"];
  tFn: (key: string) => string;
  onPress: () => void;
  flex?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        flex,
        minHeight: tap,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? palette.primary : "transparent",
        paddingHorizontal: 4,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "800",
          color: active ? palette.primaryFg : palette.muted,
          textAlign: "center",
        }}
      >
        {tFn(tab.labelKey)}
      </Text>
    </Pressable>
  );
}

export function RoleTabs() {
  const { user, status } = useAuth();
  const { t, palette } = useI18n();
  const { profile } = useLearning();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [moreOpen, setMoreOpen] = useState(false);

  if (status === "loading") return null;
  if (!user) return null;
  if (pathname === "/login" || pathname === "/register") return null;

  const allTabs =
    user.role === "teacher"
      ? TEACHER_TABS
      : user.role === "parent"
        ? PARENT_TABS
        : filterNavLinksForGrade(STUDENT_TABS, profile?.grade);

  /* Split visible tabs from overflow */
  const primary = allTabs.length <= MAX_PRIMARY ? allTabs : allTabs.slice(0, MAX_PRIMARY - 1);
  const overflow = allTabs.length <= MAX_PRIMARY ? [] : allTabs.slice(MAX_PRIMARY - 1);
  const hasMore = overflow.length > 0;

  const isOverflowActive = overflow.some((tab) => isTabActive(tab, pathname));

  const barStyle: ViewStyle = {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: Math.max(insets.bottom, 8),
    backgroundColor: palette.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingVertical: 4,
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  };

  return (
    <>
      <View style={barStyle} accessibilityRole="tablist">
        {primary.map((tab) => (
          <TabItem
            key={tab.href}
            tab={tab}
            active={isTabActive(tab, pathname)}
            palette={palette}
            tFn={t}
            onPress={() => router.push(tab.href as never)}
          />
        ))}

        {hasMore ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("nav.more")}
            onPress={() => setMoreOpen(true)}
            style={{
              flex: 1,
              minHeight: tap,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isOverflowActive ? palette.primary : "transparent",
              paddingHorizontal: 4,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: isOverflowActive ? palette.primaryFg : palette.muted,
              }}
            >
              {t("nav.more")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* «Ещё» sheet — shown as a modal with a semi-transparent overlay */}
      <Modal
        visible={moreOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMoreOpen(false)}
        statusBarTranslucent
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(15, 23, 42, 0.35)",
            justifyContent: "flex-end",
          }}
          onPress={() => setMoreOpen(false)}
        >
          <SafeAreaView
            style={{
              backgroundColor: palette.surface,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              paddingBottom: Math.max(insets.bottom, 16),
            }}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{ gap: 0 }}
            >
              {/* Handle */}
              <View
                style={{
                  alignSelf: "center",
                  marginVertical: 10,
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: palette.border,
                }}
              />
              {overflow.map((tab) => {
                const active = isTabActive(tab, pathname);
                return (
                  <Pressable
                    key={tab.href}
                    accessibilityRole="menuitem"
                    onPress={() => {
                      setMoreOpen(false);
                      router.push(tab.href as never);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      minHeight: tap + 4,
                      paddingHorizontal: 24,
                      gap: 14,
                      backgroundColor: active ? palette.accentSoft : "transparent",
                    }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: active ? palette.primary : "transparent",
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: active ? "800" : "600",
                        color: active ? palette.primary : palette.ink,
                      }}
                    >
                      {t(tab.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </>
  );
}
