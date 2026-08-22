import { GrantsListClient } from "@/components/grants/GrantsListClient";

export default function GrantsPage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-bold text-foreground">Grants</h1>
      <p className="text-sm text-[var(--pw-muted)]">
        Programmes from the local <code className="rounded bg-black/5 px-1 py-0.5 text-xs">api/grants.json</code> list, ordered by how well
        they match your onboarding. Same logic as the financial part of{" "}
        <code className="rounded bg-black/5 px-1 text-xs">/api/generate</code>.
      </p>
      <GrantsListClient />
    </div>
  );
}
