import { studentsApiMiddleware } from "@/server/portal-plugins/studentsApiMiddleware";
import { runPortalMiddleware } from "@/server/runPortalMiddleware";

export const runtime = "nodejs";

async function handle(request: Request, ctx: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await ctx.params;
  const url = new URL(request.url);
  const path =
    (slug?.length ? `/api/students/${slug.join("/")}` : "/api/students") +
    url.search;
  return runPortalMiddleware(request, path, studentsApiMiddleware, {
    expectBoolean: true,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
