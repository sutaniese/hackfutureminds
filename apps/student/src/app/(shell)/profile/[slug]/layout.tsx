import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Профиль",
  description: "Карточка аккаунта teñ. (данные в этом браузере).",
};

export default function ProfileSlugLayout({ children }: { children: ReactNode }) {
  return children;
}
