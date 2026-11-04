import { generateStaticPageMetadata } from "@/app/lib/metadata";

// page.tsx is a client component, which cannot export metadata, so it lives here.
export const metadata = generateStaticPageMetadata(
  "/contact",
  "Contact",
  "Report a bug, suggest a feature or get in touch with the TourneyRadar maintainer.",
);

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
