import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { MobileAppShell } from "@/components/shell/MobileAppShell";
import "./globals.css";

/* Same family as `nura` (Inter) for one PathWise look */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PathWise — Student",
    template: "%s | PathWise Student",
  },
  description:
    "PathWise student app — career map, grants, and portfolio (Kazakhstan, mobile-first).",
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
    <html lang="en" className={`h-full ${inter.variable}`}>
      <body className={`${inter.className} min-h-dvh antialiased`}>
        <MobileAppShell>{children}</MobileAppShell>
      </body>
    </html>
  );
}
