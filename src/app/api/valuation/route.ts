import { NextRequest, NextResponse } from "next/server";
import { getValuationSummary } from "@/lib/inventory/valuation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");
  const storeId = searchParams.get("storeId");
  const data = await getValuationSummary(
    locationId ?? undefined,
    storeId ?? undefined
  );
  return NextResponse.json(data);
}
