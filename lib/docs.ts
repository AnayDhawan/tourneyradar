export type Doc = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  author_type: "maintainer" | "user";
  author_player_id: string | null;
  author_display_name: string;
  status: "published" | "unpublished";
  created_at: string;
  updated_at: string;
};

export function attributionLine(doc: Pick<Doc, "author_type" | "author_display_name">): string {
  return doc.author_type === "maintainer"
    ? "Written by TourneyRadar maintainers"
    : `Written by ${doc.author_display_name}`;
}

/** Slugifies a doc title into a URL-safe, lowercase, hyphenated slug. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
