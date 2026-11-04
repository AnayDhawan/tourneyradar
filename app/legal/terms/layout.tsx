import { generateStaticPageMetadata } from "@/app/lib/metadata";

// page.tsx is a client component, which cannot export metadata, so it lives here.
export const metadata = generateStaticPageMetadata(
  "/legal/terms",
  "Terms of Service",
  "The rules for using TourneyRadar and its tournament data.",
);

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
