import type { Metadata } from "next";
import { GrantsListClient } from "@/components/grants/GrantsListClient";

export const metadata: Metadata = {
  title: "Стипендии и гранты",
  description: "Каталог стипендий — как в teñ. (каталог, фильтры, сетка).",
};

/* Catalog layout matches /hackhack-reference.jpg (teñ. shell) */
export default function GrantsPage() {
  return <GrantsListClient />;
}
