import { Inter, Lora } from "next/font/google";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/* teñ. wordmark — Image #1: serif, blue letters, black full stop */
export const loraWordmark = Lora({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});
