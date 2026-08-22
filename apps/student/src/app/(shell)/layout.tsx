import { MobileAppShell } from "@/components/shell/MobileAppShell";

/**
 * Student mobile shell (bottom nav, top bar) — not used under `/hub` (portal).
 */
export default function StudentShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <MobileAppShell>{children}</MobileAppShell>;
}
