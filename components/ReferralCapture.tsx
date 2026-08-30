"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { captureReferralCode } from "@/lib/referral";

function ReferralCaptureInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    captureReferralCode(searchParams.get("ref"));
    // Only ever needs to run once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// Renders nothing. Reads `?ref=CODE` off the homepage URL once on mount and
// stashes it (see lib/referral.ts) for registration to pick up later.
// Wrapped in its own Suspense boundary so useSearchParams doesn't force the
// whole homepage into dynamic rendering, same pattern as app/feedback/page.tsx.
export default function ReferralCapture() {
  return (
    <Suspense fallback={null}>
      <ReferralCaptureInner />
    </Suspense>
  );
}
