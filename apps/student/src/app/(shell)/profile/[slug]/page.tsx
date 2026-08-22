import { ProfilePageClient } from "@/components/profile/ProfilePageClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Профиль",
  description: "Карточка аккаунта teñ. (данные в этом браузере).",
};

export default async function ProfileSlugPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;
  return <ProfilePageClient slug={slug} />;
}
