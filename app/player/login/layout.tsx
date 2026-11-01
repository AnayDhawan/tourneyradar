import { generateStaticPageMetadata } from "@/app/lib/metadata";

// page.tsx is a client component, which cannot export metadata, so it lives here.
export const metadata = generateStaticPageMetadata(
  "/player/login",
  "Player Login",
  "Log in to your TourneyRadar player account to manage your wishlist and tournament preferences.",
);

export default function PlayerLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
