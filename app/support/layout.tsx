import { generateStaticPageMetadata } from "@/app/lib/metadata";

// page.tsx is a client component, which cannot export metadata, so it lives here.
export const metadata = generateStaticPageMetadata(
  "/support",
  "Support TourneyRadar",
  "TourneyRadar is free and open source, maintained by one person. Ways to help, starting with a GitHub star.",
);

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
