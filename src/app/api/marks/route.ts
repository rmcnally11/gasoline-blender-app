import { fetchLatestPlattsDaily } from "@/lib/marks/airtable";
import { NextResponse } from "next/server";

// Read AIRTABLE_API_KEY at request time so a Vercel env add + redeploy is enough.
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await fetchLatestPlattsDaily();
  return NextResponse.json(result);
}
