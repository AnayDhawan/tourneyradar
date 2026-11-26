import type { Metadata } from "next";
import BaseLayout from "@/components/BaseLayout";
import AdminSubmissionsClient from "./AdminSubmissionsClient";

export const metadata: Metadata = {
  title: "Review submissions",
  robots: { index: false, follow: false },
};

export default function AdminSubmissionsPage() {
  return (
    <BaseLayout showHero heroTitle={<>Review <span className="highlight">submissions</span></>}>
      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "860px" }}>
          <AdminSubmissionsClient />
        </div>
      </section>
    </BaseLayout>
  );
}
