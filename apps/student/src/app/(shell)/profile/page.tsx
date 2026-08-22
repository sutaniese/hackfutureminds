"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { profileHref } from "@/lib/profile-slug";
import { useI18n } from "@/i18n/I18nProvider";

export default function ProfileIndexPage() {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    const u = getCurrentUser();
    if (u) {
      router.replace(profileHref(u.email));
      return;
    }
    router.replace(`/register?redirect=${encodeURIComponent("/profile")}`);
  }, [router]);

  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <p className="text-sm text-pathwise-muted">{t("profile.redirecting")}</p>
    </div>
  );
}
