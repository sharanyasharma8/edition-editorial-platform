import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ status: "alive", service: "edition-web" }, { headers: { "Cache-Control": "no-store" } });
}
