import { generateStaticPageMetadata } from "@/app/lib/metadata";

// page.tsx is a client component, which cannot export metadata, so it lives here.
export const metadata = generateStaticPageMetadata(
  "/about",
  "About",
  "What TourneyRadar is: a free, open-source map of over-the-board chess tournaments worldwide, built from Chess-Results.com data.",
);

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
