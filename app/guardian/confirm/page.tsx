import type { Metadata } from "next";
import { Suspense } from "react";
import BaseLayout from "@/components/BaseLayout";
import GuardianConfirmClient from "./GuardianConfirmClient";

export const metadata: Metadata = {
  title: "Confirm an account",
  robots: { index: false, follow: false },
};

// Reached from the email sent to a parent or guardian (#254). They are not a
// TourneyRadar user, so nothing here needs a session.
export default function GuardianConfirmPage() {
  return (
    <BaseLayout
      showHero
      heroTitle={<>Confirm <span className="highlight">an account</span></>}
    >
      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "600px" }}>
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <Suspense fallback={null}>
              <GuardianConfirmClient />
            </Suspense>
          </div>
        </div>
      </section>
    </BaseLayout>
  );
}
