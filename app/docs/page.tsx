import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import type { Doc } from "@/lib/docs";
import DocsPageClient from "./DocsPageClient";

export const metadata: Metadata = {
  title: "Docs",
  description: "Guides for using TourneyRadar, written by maintainers and players.",
};

export default async function DocsPage() {
  const { data } = await supabase
    .from("docs")
    .select("id, slug, title, summary, author_type, author_display_name, created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const docs = (data ?? []) as Pick<Doc, "id" | "slug" | "title" | "summary" | "author_type" | "author_display_name" | "created_at">[];
  const maintainerDocs = docs.filter((d) => d.author_type === "maintainer");
  const userDocs = docs.filter((d) => d.author_type === "user");

  return <DocsPageClient maintainerDocs={maintainerDocs} userDocs={userDocs} />;
}
