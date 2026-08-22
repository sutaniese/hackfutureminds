import { recommendationLetterMiddleware } from "@/server/portal-plugins/recommendationLetterMiddleware";
import { runPortalMiddleware } from "@/server/runPortalMiddleware";

export const runtime = "nodejs";

async function handle(request: Request) {
  const url = new URL(request.url);
  return runPortalMiddleware(
    request,
    `/api/recommendation-letter${url.search}`,
    recommendationLetterMiddleware,
  );
}

export const POST = handle;
export const OPTIONS = handle;
