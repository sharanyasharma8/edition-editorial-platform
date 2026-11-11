import { getSession } from "@/lib/auth";
import { StudioLogin } from "@/components/StudioLogin";
import { MediaLibrary } from "@/components/MediaLibrary";
export default async function MediaPage() { const user = await getSession(); return user ? <MediaLibrary canUpload={user.role !== "AUTHOR"} /> : <StudioLogin />; }
