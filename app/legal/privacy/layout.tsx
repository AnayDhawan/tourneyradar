import { generateStaticPageMetadata } from "@/app/lib/metadata";

// page.tsx is a client component, which cannot export metadata, so it lives here.
export const metadata = generateStaticPageMetadata(
  "/legal/privacy",
  "Privacy Policy",
  "What data TourneyRadar collects, which analytics it uses, and how to delete your account.",
);

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
