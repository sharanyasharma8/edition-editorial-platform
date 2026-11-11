import { NextResponse } from "next/server";
import { promoteScheduledArticles } from "@/lib/repository";
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const count = await promoteScheduledArticles();
  return NextResponse.json({ published: count, ranAt: new Date().toISOString() });
}
