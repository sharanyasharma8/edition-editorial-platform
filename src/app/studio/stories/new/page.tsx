import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { StudioLogin } from "@/components/StudioLogin";
import { ArticleEditor } from "@/components/ArticleEditor";
export const metadata: Metadata = { title: "New story — Editorial Studio" };
export const dynamic = "force-dynamic";
export default async function NewStoryPage() { const user = await getSession(); return user ? <div className="studio-editor-page"><ArticleEditor canPublish={user.role !== "AUTHOR"} /></div> : <StudioLogin />; }
