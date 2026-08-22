import type { IncomingMessage, ServerResponse } from "node:http";
import { createMocks, type RequestMethod } from "node-mocks-http";
import { readBody } from "@/server/portal-plugins/readBody";

type PortalMw = (
  req: IncomingMessage,
  res: ServerResponse,
  readBodyFn: typeof readBody,
) => Promise<boolean | void | undefined>;

function headersFromMock(res: ServerResponse): Headers {
  const h = new Headers();
  const raw = res.getHeaders();
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      for (const x of v) h.append(k, x);
    } else {
      h.set(k, String(v));
    }
  }
  return h;
}

/**
 * Runs existing Node middleware under Next.js Route Handlers.
 * Uses `node-mocks-http` so `readBody(req)` (stream listeners) still works.
 */
export async function runPortalMiddleware(
  request: Request,
  pathnameWithSearch: string,
  middleware: PortalMw,
  options?: { expectBoolean?: boolean },
): Promise<Response> {
  const method = (request.method?.toUpperCase() ?? "GET") as RequestMethod;
  const bodyText =
    method === "GET" || method === "HEAD" || method === "OPTIONS"
      ? ""
      : await request.text();

  const { req, res } = createMocks({
    method,
    url: pathnameWithSearch,
    headers: Object.fromEntries(request.headers),
  });

  if (bodyText) {
    queueMicrotask(() => {
      (req as { send: (s: string) => void }).send(bodyText);
    });
  }

  const handled = await middleware(
    req as IncomingMessage,
    res as ServerResponse,
    readBody,
  );

  if (options?.expectBoolean && handled === false) {
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const status = res.statusCode || 200;
  const raw = (res as { _getData?: () => string })._getData?.() ?? "";
  const headers = headersFromMock(res);

  if (!headers.has("content-type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }

  return new Response(raw, { status, headers });
}
