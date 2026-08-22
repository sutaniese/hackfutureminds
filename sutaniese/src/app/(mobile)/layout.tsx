import { MobileAppShell } from "@/components/shell/MobileAppShell";

export default function MobileLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <MobileAppShell>{children}</MobileAppShell>;
}
