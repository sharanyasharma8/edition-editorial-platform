import type { Metadata } from "next";
import { getSession, canPublish } from "@/lib/auth";
import { getContributors } from "@/lib/repository";
import { StudioLogin } from "@/components/StudioLogin";
import { ContributorManager } from "@/components/ContributorManager";

export const metadata: Metadata = { title: "Contributors — Editorial Studio" };
export const dynamic = "force-dynamic";

export default async function ContributorsPage() {
  const user = await getSession();
  if (!user) return <StudioLogin />;
  const contributors = await getContributors();
  return <ContributorManager initialContributors={contributors} canManage={canPublish(user.role)} />;
}
