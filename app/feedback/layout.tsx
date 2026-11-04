import { generateStaticPageMetadata } from "@/app/lib/metadata";

// page.tsx is a client component, which cannot export metadata, so it lives here.
export const metadata = generateStaticPageMetadata(
  "/feedback",
  "Feedback",
  "Send feedback on TourneyRadar: what works, what broke, and what you want next.",
);

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
