import type { Metadata, Viewport } from "next";
import { MobileAppShell } from "@/components/shell/MobileAppShell";
import { inter } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "teñ. — student",
    template: "%s | teñ. student",
  },
  description:
    "teñ. student app — career map, grants, and portfolio (Kazakhstan, mobile-first).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d4ed8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full w-full min-w-0 ${inter.variable}`}>
      <body
        className={`${inter.className} min-h-dvh w-full min-w-0 overflow-x-hidden bg-pathwise-page antialiased`}
      >
        <MobileAppShell>{children}</MobileAppShell>
      </body>
    </html>
  );
}
