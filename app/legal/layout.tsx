import { generateStaticPageMetadata } from "@/app/lib/metadata";

// page.tsx is a client component, which cannot export metadata, so it lives here.
export const metadata = generateStaticPageMetadata(
  "/legal",
  "Legal",
  "Terms of service and privacy policy for TourneyRadar.",
);

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
