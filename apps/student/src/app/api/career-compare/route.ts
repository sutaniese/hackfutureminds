import { careerCompareMiddleware } from "@/server/portal-plugins/careerCompareMiddleware";
import { runPortalMiddleware } from "@/server/runPortalMiddleware";

export const runtime = "nodejs";

async function handle(request: Request) {
  const url = new URL(request.url);
  return runPortalMiddleware(
    request,
    `/api/career-compare${url.search}`,
    careerCompareMiddleware,
  );
}

export const POST = handle;
export const OPTIONS = handle;
