import type { Metadata } from "next";
import { Suspense } from "react";
import { GrantsListClient } from "@/components/grants/GrantsListClient";

export const metadata: Metadata = {
  title: "Стипендии и гранты",
  description: "Каталог стипендий — как в teñ. (каталог, фильтры, сетка).",
};

/* Catalog layout matches /hackhack-reference.jpg (teñ. shell) */
export default function GrantsPage() {
  return (
    <Suspense fallback={<div className="pw-shimmer min-h-[28rem] w-full rounded-3xl bg-white" aria-hidden />}>
      <GrantsListClient />
    </Suspense>
  );
}
