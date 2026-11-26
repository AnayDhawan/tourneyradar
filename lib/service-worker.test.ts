import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

// Runs the real public/sw.js in a vm sandbox with a hand-rolled Cache Storage
// and fetch, then dispatches install / activate / fetch events at it. What is
// pinned here is the issue's cache contract: shell and hashed assets only, and
// /api, Supabase, auth and pages never served from (or written to) a cache.

const SW_SOURCE = readFileSync(path.join(import.meta.dirname, "..", "public", "sw.js"), "utf8");
const ORIGIN = "https://www.tourneyradar.com";

interface FakeResponse {
  status: number;
  type: string;
  headers: { get(name: string): string | null };
  body: string;
  clone(): FakeResponse;
}

function response(
  body: string,
  init: { status?: number; type?: string; headers?: Record<string, string> } = {}
): FakeResponse {
  const headers = init.headers ?? {};
  const r: FakeResponse = {
    status: init.status ?? 200,
    type: init.type ?? "basic",
    headers: { get: (name) => headers[name] ?? null },
    body,
    clone: () => r,
  };
  return r;
}

interface FakeRequest {
  url: string;
  method: string;
  mode: string;
  headers: { get(name: string): string | null };
}

function request(
  url: string,
  init: { method?: string; mode?: string; headers?: Record<string, string> } = {}
): FakeRequest {
  const headers = init.headers ?? {};
  return {
    url: url.startsWith("http") ? url : `${ORIGIN}${url}`,
    method: init.method ?? "GET",
    mode: init.mode ?? "no-cors",
    headers: { get: (name) => headers[name] ?? null },
  };
}

class FakeCache {
  entries = new Map<string, FakeResponse>();
  constructor(private readonly fetchFn: (req: FakeRequest) => Promise<FakeResponse>) {}
  private key(req: FakeRequest | string): string {
    return typeof req === "string" ? new URL(req, ORIGIN).pathname + new URL(req, ORIGIN).search : new URL(req.url).pathname + new URL(req.url).search;
  }
  async match(req: FakeRequest | string) {
    return this.entries.get(this.key(req));
  }
  async put(req: FakeRequest | string, res: FakeResponse) {
    this.entries.set(this.key(req), res);
  }
  async addAll(urls: string[]) {
    for (const url of urls) {
      const res = await this.fetchFn(request(url));
      if (res.status !== 200) throw new Error(`addAll: ${url} returned ${res.status}`);
      await this.put(url, res);
    }
  }
  async keys() {
    return [...this.entries.keys()].map((k) => request(k));
  }
  async delete(req: FakeRequest | string) {
    return this.entries.delete(this.key(req));
  }
}

type Listener = (event: Record<string, unknown>) => void;

function loadWorker(version: string | null, networkFetch?: (req: FakeRequest) => Promise<FakeResponse>) {
  const fetchSpy = vi.fn(networkFetch ?? (async (req: FakeRequest) => response(`net:${req.url}`)));
  const stores = new Map<string, FakeCache>();
  const listeners = new Map<string, Listener>();
  const openCache = (name: string) => {
    let c = stores.get(name);
    if (!c) stores.set(name, (c = new FakeCache(fetchSpy)));
    return c;
  };
  const caches = {
    open: async (name: string) => openCache(name),
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  };
  const calls = { skipWaiting: 0, claim: 0 };
  const self = {
    location: { href: `${ORIGIN}/sw.js${version === null ? "" : `?v=${version}`}`, origin: ORIGIN },
    addEventListener: (type: string, fn: Listener) => listeners.set(type, fn),
    skipWaiting: async () => void calls.skipWaiting++,
    clients: { claim: async () => void calls.claim++ },
  };
  const sandbox = {
    self,
    caches,
    fetch: fetchSpy,
    URL,
    Promise,
    Response: { error: () => response("", { status: 0, type: "error" }) },
  };
  vm.runInNewContext(SW_SOURCE, sandbox);

  const dispatch = async (type: string, extra: Record<string, unknown> = {}) => {
    const waits: Promise<unknown>[] = [];
    let responded: Promise<FakeResponse> | undefined;
    listeners.get(type)?.({
      ...extra,
      waitUntil: (p: Promise<unknown>) => waits.push(p),
      respondWith: (p: Promise<FakeResponse>) => (responded = p),
    });
    await Promise.all(waits);
    return responded;
  };

  return {
    stores,
    calls,
    fetchSpy,
    install: () => dispatch("install"),
    activate: () => dispatch("activate"),
    // undefined means the worker did not call respondWith: the browser handles
    // the request itself, straight to the network, and nothing is cached.
    fetchEvent: (req: FakeRequest) => dispatch("fetch", { request: req }),
    cacheNames: () => [...stores.keys()].sort(),
    cachedPaths: () => [...stores.values()].flatMap((c) => [...c.entries.keys()]),
  };
}

async function installed(version = "abc123", networkFetch?: (req: FakeRequest) => Promise<FakeResponse>) {
  const sw = loadWorker(version, networkFetch);
  await sw.install();
  await sw.activate();
  return sw;
}

describe("install and activate", () => {
  it("precaches the offline page and manifest/icons into a cache named after the build", async () => {
    const sw = await installed("abc123");
    expect(sw.cacheNames()).toEqual(["tr-shell-abc123"]);
    const paths = sw.cachedPaths();
    expect(paths).toContain("/offline.html");
    expect(paths).toContain("/site.webmanifest");
    expect(paths).toContain("/web-app-manifest-512x512.png");
    // The shell holds no pages.
    expect(paths.filter((p) => !/\.(html|webmanifest|png|ico|svg)$/.test(p))).toEqual([]);
  });

  it("activates immediately and claims open tabs", async () => {
    const sw = await installed();
    expect(sw.calls.skipWaiting).toBe(1);
    expect(sw.calls.claim).toBe(1);
  });

  it("fails the install when the shell cannot be fetched, so a half-built shell never activates", async () => {
    const sw = loadWorker("v1", async () => response("nope", { status: 500 }));
    await expect(sw.install()).rejects.toThrow();
    expect(sw.calls.skipWaiting).toBe(0);
  });

  it("falls back to a dev cache name when registered without a version", async () => {
    const sw = await installed("");
    expect(sw.cacheNames()).toEqual(["tr-shell-dev"]);
  });

  it("deletes shell caches from earlier deploys on activate but keeps the hashed-asset cache", async () => {
    const sw = loadWorker("new");
    sw.stores.set("tr-shell-old", new FakeCache(sw.fetchSpy));
    sw.stores.set("tr-static", new FakeCache(sw.fetchSpy));
    sw.stores.set("someone-elses-cache", new FakeCache(sw.fetchSpy));
    await sw.install();
    await sw.activate();
    expect(sw.cacheNames()).toEqual(["someone-elses-cache", "tr-shell-new", "tr-static"]);
  });
});

describe("requests the worker must not touch", () => {
  const untouched: [string, FakeRequest][] = [
    ["an /api route", request("/api/tournaments?country=IN")],
    ["a player API route", request("/api/player/account")],
    ["the wishlist API", request("/api/wishlist")],
    ["an /auth path", request("/auth/callback")],
    ["the analytics relay", request("/relay/api/send")],
    ["Vercel analytics", request("/_vercel/insights/script.js")],
    ["Supabase REST", request("https://abc.supabase.co/rest/v1/tournaments?select=*")],
    ["Supabase auth", request("https://abc.supabase.co/auth/v1/token?grant_type=refresh_token")],
    ["a map tile", request("https://a.tile.openstreetmap.org/3/4/5.png")],
    ["a cross-origin hashed-looking path", request("https://cdn.example.com/_next/static/chunk.js")],
    ["a POST", request("/api/tournaments/submit", { method: "POST" })],
    ["a POST to a page", request("/player/login", { method: "POST", mode: "navigate" })],
    ["a request carrying Authorization", request("/_next/static/chunks/a.js", { headers: { Authorization: "Bearer x" } })],
    ["a navigation to an /api route", request("/api/dataset", { mode: "navigate" })],
    ["a Next.js RSC/data fetch", request("/country/in?_rsc=abc", { headers: { RSC: "1" } })],
    ["an arbitrary same-origin GET", request("/stats/data.json")],
  ];

  it.each(untouched)("leaves %s to the browser and caches nothing", async (_label, req) => {
    const sw = await installed();
    const before = sw.cachedPaths();
    const networkCalls = sw.fetchSpy.mock.calls.length;
    expect(await sw.fetchEvent(req)).toBeUndefined();
    // The worker did not fetch on the page's behalf either.
    expect(sw.fetchSpy.mock.calls.length).toBe(networkCalls);
    expect(sw.cachedPaths()).toEqual(before);
  });
});

describe("navigations", () => {
  it("go to the network and are never written to a cache", async () => {
    const sw = await installed();
    const before = sw.cachedPaths();
    const res = await sw.fetchEvent(request("/country/in", { mode: "navigate" }));
    expect((await res)?.body).toBe(`net:${ORIGIN}/country/in`);
    expect(sw.cachedPaths()).toEqual(before);
  });

  it("serve fresh content after a deploy even when an older page was seen before", async () => {
    let body = "v1";
    const sw = await installed("v1", async () => response(body));
    const nav = request("/", { mode: "navigate" });
    expect((await (await sw.fetchEvent(nav)))?.body).toBe("v1");
    body = "v2";
    expect((await (await sw.fetchEvent(nav)))?.body).toBe("v2");
  });

  it("fall back to the offline page only when the network fails", async () => {
    let offline = false;
    const sw = await installed("v1", async (req) => {
      if (offline && !req.url.endsWith("/offline.html")) throw new TypeError("Failed to fetch");
      return response(`net:${req.url}`);
    });
    sw.stores.get("tr-shell-v1")!.entries.set("/offline.html", response("OFFLINE PAGE"));
    offline = true;
    const res = await sw.fetchEvent(request("/tournaments", { mode: "navigate" }));
    expect((await res)?.body).toBe("OFFLINE PAGE");
  });

  it("do not turn an HTTP error from the server into the offline page", async () => {
    let down = false;
    const sw = await installed("v1", async (req) =>
      down ? response("server error", { status: 503 }) : response(`net:${req.url}`)
    );
    down = true;
    const res = await sw.fetchEvent(request("/", { mode: "navigate" }));
    expect((await res)?.status).toBe(503);
  });
});

describe("hashed static assets", () => {
  const asset = request("/_next/static/chunks/app-1a2b3c.js");

  it("are fetched once, stored, then served from the cache", async () => {
    const sw = await installed();
    const first = await sw.fetchEvent(asset);
    expect((await first)?.body).toBe(`net:${ORIGIN}/_next/static/chunks/app-1a2b3c.js`);
    expect(sw.cachedPaths()).toContain("/_next/static/chunks/app-1a2b3c.js");

    const callsAfterFirst = sw.fetchSpy.mock.calls.length;
    const second = await sw.fetchEvent(asset);
    expect((await second)?.body).toBe(`net:${ORIGIN}/_next/static/chunks/app-1a2b3c.js`);
    expect(sw.fetchSpy.mock.calls.length).toBe(callsAfterFirst);
  });

  it("are not stored when the response failed", async () => {
    const sw = await installed("v1", async (req) =>
      req.url.includes("/_next/") ? response("missing", { status: 404 }) : response("ok")
    );
    const res = await sw.fetchEvent(asset);
    expect((await res)?.status).toBe(404);
    expect(sw.cachedPaths()).not.toContain("/_next/static/chunks/app-1a2b3c.js");
  });

  it.each([
    ["no-store", { "Cache-Control": "no-store" }],
    ["private", { "Cache-Control": "private, max-age=60" }],
    ["a cookie", { "Set-Cookie": "sb=1" }],
  ])("are not stored when the response carries %s", async (_label, headers) => {
    const sw = await installed("v1", async (req) =>
      req.url.includes("/_next/") ? response("x", { headers }) : response("ok")
    );
    await sw.fetchEvent(asset);
    expect(sw.cachedPaths()).not.toContain("/_next/static/chunks/app-1a2b3c.js");
  });

  it("are not stored when the response is opaque or redirected away", async () => {
    const sw = await installed("v1", async (req) =>
      req.url.includes("/_next/") ? response("x", { type: "opaqueredirect", status: 0 }) : response("ok")
    );
    await sw.fetchEvent(asset);
    expect(sw.cachedPaths()).not.toContain("/_next/static/chunks/app-1a2b3c.js");
  });

  it("are capped to the most recent entries", async () => {
    const sw = await installed("v1");
    for (let i = 0; i < 160; i++) await sw.fetchEvent(request(`/_next/static/chunks/c${i}.js`));
    const cache = sw.stores.get("tr-static")!;
    expect(cache.entries.size).toBe(150);
    // Oldest evicted, newest kept.
    expect(cache.entries.has("/_next/static/chunks/c0.js")).toBe(false);
    expect(cache.entries.has("/_next/static/chunks/c159.js")).toBe(true);
  });
});

describe("shell files", () => {
  it("are served from the current deploy's shell cache", async () => {
    const sw = await installed("v1");
    sw.stores.get("tr-shell-v1")!.entries.set("/site.webmanifest", response("CACHED MANIFEST"));
    const res = await sw.fetchEvent(request("/site.webmanifest"));
    expect((await res)?.body).toBe("CACHED MANIFEST");
  });

  it("fall back to the network when missing from the cache", async () => {
    const sw = await installed("v1");
    sw.stores.get("tr-shell-v1")!.entries.delete("/favicon.ico");
    const res = await sw.fetchEvent(request("/favicon.ico"));
    expect((await res)?.body).toBe(`net:${ORIGIN}/favicon.ico`);
  });
});

describe("shipped files", () => {
  it("offline.html exists and is a complete document", () => {
    const html = readFileSync(path.join(import.meta.dirname, "..", "public", "offline.html"), "utf8");
    expect(html).toMatch(/<title>/);
    expect(html).toMatch(/offline/i);
  });

  it("every precached path exists in public/", () => {
    const block = SW_SOURCE.match(/SHELL_URLS = \[([\s\S]*?)\];/)?.[1] ?? "";
    const urls = [...block.matchAll(/"(\/[^"]+)"/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(() => readFileSync(path.join(import.meta.dirname, "..", "public", url))).not.toThrow();
    }
  });
});
