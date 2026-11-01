import { generateStaticPageMetadata } from "@/app/lib/metadata";

// page.tsx is a client component, which cannot export metadata, so it lives here.
export const metadata = generateStaticPageMetadata(
  "/api-docs",
  "API Docs",
  "Documentation for the TourneyRadar public API: endpoints, query parameters, a quick start and the response shape.",
);

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
