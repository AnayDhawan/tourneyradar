"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BaseLayout from "@/components/BaseLayout";
import FeedbackForm from "@/components/FeedbackForm";

function FeedbackPageInner() {
  const searchParams = useSearchParams();
  const fromPage = searchParams.get("from") || "/";

  return (
    <div className="feedback-card">
      <FeedbackForm fromPage={fromPage} />
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <BaseLayout>
      <section className="feedback-section">
        <Suspense fallback={null}>
          <FeedbackPageInner />
        </Suspense>
      </section>
    </BaseLayout>
  );
}
