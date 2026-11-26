"use client";

import { useEffect } from "react";

// Registers public/sw.js so the web manifest produces an installable app.
// Renders nothing. The build id goes in the query string on purpose: the script
// URL then changes on every deploy, which makes the browser install the new
// worker (and the worker builds a fresh shell cache from the same value), so a
// deploy cannot leave users on an old shell. See public/sw.js for the cache rules.
//
// Production only: in `next dev` a worker would sit in front of the dev server's
// hot-reloaded chunks and make stale assets very hard to debug.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const buildId = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
    const register = () => {
      navigator.serviceWorker
        .register(`/sw.js?v=${encodeURIComponent(buildId)}`, { scope: "/" })
        .catch(() => {
          // Registration is an enhancement; the site works the same without it.
        });
    };

    // Wait for load so the worker's install-time downloads never compete with
    // the page's own first render.
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
