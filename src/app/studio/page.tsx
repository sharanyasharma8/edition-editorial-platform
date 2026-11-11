import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { StudioLogin } from "@/components/StudioLogin";
import { StudioDashboard } from "@/components/StudioDashboard";
export const metadata: Metadata = { title: "Editorial Studio" };
export const dynamic = "force-dynamic";
export default async function StudioPage() { const user = await getSession(); return user ? <StudioDashboard user={user} /> : <StudioLogin />; }
