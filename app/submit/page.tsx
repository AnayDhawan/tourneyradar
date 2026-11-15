import type { Metadata } from "next";
import BaseLayout from "@/components/BaseLayout";
import SubmitTournamentClient from "./SubmitTournamentClient";

export const metadata: Metadata = {
  title: "Submit a tournament",
  description:
    "Run a chess tournament that is not on Chess-Results.com? Send it in and we will review it before it appears on the map.",
  alternates: { canonical: "/submit" },
};

export default function SubmitPage() {
  return (
    <BaseLayout
      showHero
      heroTitle={<>Submit a <span className="highlight">tournament</span></>}
    >
      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "640px" }}>
          <SubmitTournamentClient />
        </div>
      </section>
    </BaseLayout>
  );
}
