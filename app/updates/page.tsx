import type { Metadata } from "next";
import { getChangelog } from "@/lib/changelog";
import UpdatesPageClient from "./UpdatesPageClient";

export const metadata: Metadata = {
  title: "Updates",
  description: "What shipped on TourneyRadar, and when.",
  alternates: { canonical: "https://www.tourneyradar.com/updates" },
};

export default function UpdatesPage() {
  const releases = getChangelog();
  return <UpdatesPageClient releases={releases} />;
}
