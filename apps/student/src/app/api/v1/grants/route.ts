import { NextResponse } from "next/server";
import { queryLiveGrants } from "@/lib/grants-live-query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await queryLiveGrants({
      field: searchParams.get("field"),
      level: searchParams.get("level"),
      type: searchParams.get("type"),
      country: searchParams.get("country"),
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/v1/grants]", e);
    return NextResponse.json(
      {
        data: [],
        total: 0,
        source: "fallback",
        warning: e instanceof Error ? e.message : "internal_error",
      },
      { status: 200 },
    );
  }
}
