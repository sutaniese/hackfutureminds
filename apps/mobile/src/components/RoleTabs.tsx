import { usePathname, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { tap } from "../lib/theme";

type Tab = { href: string; labelKey: string; match?: (path: string) => boolean };

const STUDENT_TABS: Tab[] = [
  { href: "/", labelKey: "nav.home", match: (p) => p === "/" },
  { href: "/onboarding", labelKey: "nav.onboarding" },
  { href: "/learning", labelKey: "nav.learning", match: (p) => p === "/learning" || (p.startsWith("/learning/") && !p.startsWith("/learning/class") && !p.startsWith("/learning/clips")) },
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

export function RoleTabs() {
  const { user, status } = useAuth();
  const { t, palette } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (status === "loading") return null;
  if (!user) return null;
  if (pathname === "/login" || pathname === "/register") return null;

  const tabs = user.role === "teacher" ? TEACHER_TABS : user.role === "parent" ? PARENT_TABS : STUDENT_TABS;

  return (
    <View
      style={{
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
      }}
    >
      {tabs.map((tab) => {
        const active = tab.match ? tab.match(pathname) : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Pressable
            key={tab.href}
            onPress={() => router.push(tab.href as never)}
            style={{
              flex: 1,
              minHeight: tap,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? palette.primary : "transparent",
              paddingHorizontal: 2,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: tabs.length > 5 ? 10 : 11,
                fontWeight: "800",
                color: active ? palette.primaryFg : palette.muted,
              }}
            >
              {t(tab.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
