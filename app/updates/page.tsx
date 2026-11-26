import { getChangelog } from "@/lib/changelog";
import { generateStaticPageMetadata } from "@/app/lib/metadata";
import UpdatesPageClient from "./UpdatesPageClient";

export const metadata = generateStaticPageMetadata(
  "/updates",
  "Updates",
  "What shipped on TourneyRadar, and when.",
);

export default function UpdatesPage() {
  const releases = getChangelog();
  return <UpdatesPageClient releases={releases} />;
}
