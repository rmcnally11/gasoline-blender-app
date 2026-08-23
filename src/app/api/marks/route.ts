import { fetchLatestPlattsDaily } from "@/lib/marks/airtable";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await fetchLatestPlattsDaily();
  return NextResponse.json(result);
}
