import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers/Providers";
import { inter } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "teñ. — карьерная навигация (RU/KK/EN)",
    template: "%s | teñ.",
  },
  description:
    "teñ. — карта направлений, гранты, портфолио. Казахстан, мобильно в первую очередь.",
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
    <html lang="ru" className={`h-full w-full min-w-0 ${inter.variable}`} suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-dvh w-full min-w-0 overflow-x-hidden bg-pathwise-page antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
