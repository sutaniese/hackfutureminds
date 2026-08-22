import { PortfolioUploadClient } from "@/components/portfolio/PortfolioUploadClient";

export default function PortfolioPage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-bold text-foreground">Portfolio</h1>
      <p className="text-sm text-[var(--pw-muted)]">
        Add notes and your own files (CV, certificates, PDFs) before the
        step-7 camera flow. Nothing here is processed by a server in this
        build — it stays in your browser for the session.
      </p>
      <div className="pw-card p-4">
        <PortfolioUploadClient />
      </div>
    </div>
  );
}
