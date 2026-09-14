import { NextRequest, NextResponse } from "next/server";

// Sets a short-lived, readable cookie with the viewer's country, sourced
// from Vercel's edge geo header (x-vercel-ip-country -- ISO 3166-1 alpha-2,
// absent in local dev and on non-Vercel hosts). Deliberately a cookie set
// here rather than a header read in app/page.tsx's server component: reading
// request-specific data there would force the whole homepage out of static
// rendering. A cookie read client-side in HomePageClient.tsx keeps the page
// itself cacheable and only needs a one-time client read on mount.
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const country = request.headers.get("x-vercel-ip-country");
  if (country) {
    response.cookies.set("tr_geo_country", country, {
      maxAge: 60 * 60 * 24, // 1 day, re-set on the next visit regardless
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: "/",
};
