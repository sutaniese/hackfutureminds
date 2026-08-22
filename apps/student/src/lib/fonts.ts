import { Inter, Plus_Jakarta_Sans, Lora } from "next/font/google";

export const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const loraWordmark = Lora({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});
