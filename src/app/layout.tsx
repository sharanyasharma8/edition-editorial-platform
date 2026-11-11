import type { Metadata } from "next";
import "@/app/globals.css";
export const metadata: Metadata = { title: { default: "EDITION — Independent Perspectives", template: "%s · EDITION" }, description: "A shared publishing platform for two independent editorial journals: THE EDIT and FORM.", metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"), openGraph: { type: "website", siteName: "EDITION", title: "EDITION — Independent Perspectives", description: "Stories worth staying with." } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a>{children}</body></html>;
}
