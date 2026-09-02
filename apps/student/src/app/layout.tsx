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
    "teñ. — персональное обучение, карта направлений, гранты. Мобильно в первую очередь.",
  applicationName: "teñ.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "teñ.",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
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
        className={`${jakarta.className} min-h-dvh w-full min-w-0 overflow-x-hidden bg-pathwise-page text-foreground antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
