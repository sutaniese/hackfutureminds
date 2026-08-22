import { NextResponse } from "next/server";
import { queryLiveGrants } from "@/lib/grants-live-query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = await queryLiveGrants({
    field: searchParams.get("field"),
    level: searchParams.get("level"),
    type: searchParams.get("type"),
    country: searchParams.get("country"),
  });
  return NextResponse.json(result);
}
