import type { Metadata } from "next";
import { getSession, canPublish } from "@/lib/auth";
import { getCmsArticles } from "@/lib/repository";
import { StudioLogin } from "@/components/StudioLogin";
import { TaxonomyManager } from "@/components/TaxonomyManager";

export const metadata: Metadata = { title: "Taxonomy — Editorial Studio" };
export const dynamic = "force-dynamic";

export default async function TaxonomyPage() {
  const user = await getSession();
  if (!user) return <StudioLogin />;
  const articles = await getCmsArticles();
  return <TaxonomyManager articles={articles} canManage={canPublish(user.role)} />;
}
