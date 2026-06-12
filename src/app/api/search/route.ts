import { NextRequest, NextResponse } from "next/server";
import { globalSearch } from "@/lib/search";

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const results = await globalSearch(q);
  return NextResponse.json(results);
}
