export default function GrantsPage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-bold text-foreground">Grants</h1>
      <p className="text-sm text-[var(--pw-muted)]">
        The grant list and match reasons will be wired to local JSON and{" "}
        <code className="rounded bg-black/5 px-1 py-0.5 text-xs">/api/generate</code> later.
      </p>
      <div className="pw-card p-4 text-sm text-foreground">
        Placeholder: Bolashak, DAAD, and other KZ-relevant funding.
      </div>
    </div>
  );
}
