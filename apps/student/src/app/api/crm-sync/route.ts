import { crmSyncMiddleware } from "@/server/portal-plugins/crmSyncMiddleware";
import { runPortalMiddleware } from "@/server/runPortalMiddleware";

export const runtime = "nodejs";

async function handle(request: Request) {
  const url = new URL(request.url);
  return runPortalMiddleware(request, `/api/crm-sync${url.search}`, crmSyncMiddleware);
}

export const POST = handle;
export const OPTIONS = handle;
