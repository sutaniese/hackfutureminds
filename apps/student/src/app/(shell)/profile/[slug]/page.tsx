"use client";

import { useParams } from "next/navigation";
import { ProfilePageClient } from "@/components/profile/ProfilePageClient";

export default function ProfileSlugPage() {
  const params = useParams();
  const raw = params?.slug;
  const slug =
    Array.isArray(raw) ? (raw[0] ?? "") : typeof raw === "string" ? raw : "";
  return <ProfilePageClient slug={slug} />;
}
