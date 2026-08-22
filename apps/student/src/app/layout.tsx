import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers/Providers";
import { inter, jakarta } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "teñ. — карьерная навигация",
    template: "%s | teñ.",
  },
  description:
    "teñ. — карта направлений, гранты, портфолио. Мобильно в первую очередь.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`h-full w-full min-w-0 ${inter.variable} ${jakarta.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`${jakarta.className} min-h-dvh w-full min-w-0 overflow-x-hidden bg-pathwise-page antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
