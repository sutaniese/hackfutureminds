import { agentMiddleware } from "@/server/portal-plugins/agentMiddleware";
import { runPortalMiddleware } from "@/server/runPortalMiddleware";

export const runtime = "nodejs";

async function handle(request: Request, ctx: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await ctx.params;
  const url = new URL(request.url);
  const tail = slug?.length ? slug.join("/") : "";
  const path = `/api/agent${tail ? `/${tail}` : ""}` + url.search;
  return runPortalMiddleware(request, path, agentMiddleware, {
    expectBoolean: true,
  });
}

export const GET = handle;
export const POST = handle;
