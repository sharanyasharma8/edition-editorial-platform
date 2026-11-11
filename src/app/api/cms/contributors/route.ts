import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getContributors } from "@/lib/repository";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const contributors = await getContributors();
  return NextResponse.json({ contributors });
}
