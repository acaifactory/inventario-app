import { NextRequest, NextResponse } from "next/server";
import { getUsageAnalytics } from "@/lib/inventory/usage-analytics";

export async function GET(request: NextRequest) {
  try {
    const weeks = Number(
      new URL(request.url).searchParams.get("weeks") ?? "4"
    );
    const data = await getUsageAnalytics(weeks);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
