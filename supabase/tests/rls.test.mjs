// Row Level Security regression tests. Runs the real migrations in an
// in-process Postgres (PGlite), then attacks every table as anon, two ordinary
// users and an admin. No Docker, no network, no live project touched.
//
//   npm run test:rls
//
// Scope: only what is in supabase/migrations plus supabase/tests/baseline.sql.
// Dashboard-created state (admins, tournaments, players policies) is assumed
// there, so confirm it against the live project with supabase/audit/rls_audit.sql.

import { before, after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "migrations");

// Superseded and marked DO NOT APPLY in its own header.
const SKIP = new Set(["20260729120000_players_rls.sql"]);

const A = "aaaaaaaa-0000-4000-8000-00000000000a";
const B = "bbbbbbbb-0000-4000-8000-00000000000b";
const ADMIN = "cccccccc-0000-4000-8000-00000000000c";

let db;
const pid = {};

/** Run one statement as a Supabase role, optionally with a JWT subject. */
async function as(role, sub, sql, params = []) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [sub ?? ""]);
  await db.exec(`set role ${role}`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role");
  }
}

async function denied(role, sub, sql, params, code = "42501") {
  await assert.rejects(as(role, sub, sql, params), (e) => {
    assert.equal(e.code, code, `expected ${code}, got ${e.code}: ${e.message}`);
    return true;
  });
}

/** Rows affected by a write, where "permission denied" counts as zero. */
async function affected(role, sub, sql, params) {
  try {
    return (await as(role, sub, sql, params)).affectedRows;
  } catch (e) {
    if (e.code === "42501") return 0;
    throw e;
  }
}

/** Rows visible to a role, treating "permission denied" as zero rows. */
async function visible(role, sub, sql, params) {
  try {
    return (await as(role, sub, sql, params)).rows;
  } catch (e) {
    if (e.code === "42501") return [];
    throw e;
  }
}

const su = (sql, params = []) => db.query(sql, params);
const count = async (sql, params) => (await su(sql, params)).rows[0].n;

before(async () => {
  db = new PGlite();
  await db.exec(readFileSync(join(here, "baseline.sql"), "utf8"));
  for (const f of readdirSync(migrationsDir).sort()) {
    if (SKIP.has(f) || !f.endsWith(".sql")) continue;
    await db.exec(readFileSync(join(migrationsDir, f), "utf8"));
  }
  // Signing up is what creates the players row, via on_auth_user_created.
  await su(
    `insert into auth.users (id, email, raw_user_meta_data) values
       ($1, 'a@example.com', '{"name":"Alice","phone":"111","fide_id":"1000","rating":"1500"}'),
       ($2, 'b@example.com', '{"name":"Bob","rating":"about 1500"}'),
       ($3, 'admin@example.com', '{}')`,
    [A, B, ADMIN],
  );
  await su("insert into public.admins (auth_user_id) values ($1)", [ADMIN]);
  for (const [k, u] of [["a", A], ["b", B], ["admin", ADMIN]]) {
    pid[k] = (await su("select id from public.players where auth_user_id = $1", [u])).rows[0].id;
  }
});

after(async () => db?.close());

describe("schema-wide invariants (these catch drift when a future migration lands)", () => {
  it("every public table has RLS enabled", async () => {
    const { rows } = await su(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    assert.deepEqual(rows, []);
  });

  it("no write policy is open to anon or authenticated without a real predicate", async () => {
    const { rows } = await su(
      `select tablename, policyname from pg_policies
        where schemaname = 'public' and cmd in ('INSERT','UPDATE','DELETE','ALL')
          and roles && array['public','anon','authenticated']::name[]
          and (qual = 'true' or with_check = 'true')`,
    );
    assert.deepEqual(rows, []);
  });

  it("every SECURITY DEFINER function pins an empty search_path", async () => {
    const { rows } = await su(
      `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosecdef
          and not coalesce(p.proconfig @> array['search_path=""'], false)`,
    );
    assert.deepEqual(rows, []);
  });

  it("anon can execute only the SECURITY DEFINER helpers a policy needs", async () => {
    const allowed = new Set(["owns_player"]);
    const { rows } = await su(
      `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosecdef
          and has_function_privilege('anon', p.oid, 'execute')`,
    );
    assert.deepEqual(rows.map((r) => r.proname).filter((n) => !allowed.has(n)), []);
  });

  it("phase 4 removed the anonymous-claim helper", async () => {
    const { rows } = await su("select to_regprocedure('public.is_claimable_auth_user(uuid)') as f");
    assert.equal(rows[0].f, null);
  });
});

describe("players", () => {
  it("signup creates exactly one profile and carries the metadata", async () => {
    const { rows } = await su("select * from public.players where auth_user_id = $1", [A]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, "Alice");
    assert.equal(rows[0].phone, "111");
    assert.equal(rows[0].fide_id, "1000");
    assert.equal(rows[0].rating, 1500);
  });

  it("a non-numeric rating stores null instead of aborting signup", async () => {
    const { rows } = await su("select rating from public.players where id = $1", [pid.b]);
    assert.equal(rows[0].rating, null);
  });

  it("signup with no name falls back to the email local part", async () => {
    const id = "dddddddd-0000-4000-8000-00000000000d";
    await su("insert into auth.users (id, email) values ($1, 'noname@example.com')", [id]);
    const { rows } = await su("select name from public.players where auth_user_id = $1", [id]);
    assert.equal(rows[0].name, "noname");
  });

  it("anon reads nothing", async () => {
    assert.deepEqual(await visible("anon", null, "select id from public.players"), []);
  });

  it("anon cannot insert", async () => {
    await denied("anon", null, "insert into public.players (auth_user_id, email, name) values ($1, 'x@x', 'x')", [A]);
  });

  it("anon update and delete touch nothing", async () => {
    const total = await count("select count(*)::int as n from public.players");
    assert.equal(await affected("anon", null, "update public.players set name = 'pwned'"), 0);
    assert.equal(await affected("anon", null, "delete from public.players"), 0);
    assert.equal(await count("select count(*)::int as n from public.players where name = 'pwned'"), 0);
    assert.equal(await count("select count(*)::int as n from public.players"), total);
  });

  it("a user sees only their own row", async () => {
    const rows = await visible("authenticated", A, "select auth_user_id from public.players");
    assert.deepEqual(rows.map((r) => r.auth_user_id), [A]);
  });

  it("a user cannot read another player's email or phone by id", async () => {
    const rows = await visible("authenticated", B, "select email, phone from public.players where id = $1", [pid.a]);
    assert.deepEqual(rows, []);
  });

  it("a user can edit their own row", async () => {
    assert.equal(await affected("authenticated", A, "update public.players set name = 'Alice 2' where id = $1", [pid.a]), 1);
  });

  it("a user cannot edit someone else's row", async () => {
    assert.equal(await affected("authenticated", A, "update public.players set name = 'pwned' where id = $1", [pid.b]), 0);
  });

  it("a user cannot hand their row to another account", async () => {
    await denied("authenticated", A, "update public.players set auth_user_id = $1 where id = $2", [B, pid.a]);
  });

  it("a user cannot insert a profile for another account", async () => {
    const id = "eeeeeeee-0000-4000-8000-00000000000e";
    await su("insert into auth.users (id, email) values ($1, 'e@example.com')", [id]);
    await su("delete from public.players where auth_user_id = $1", [id]);
    await denied("authenticated", A, "insert into public.players (auth_user_id, email, name) values ($1, 'e@example.com', 'e')", [id]);
  });

  it("a user cannot create a second profile for themselves", async () => {
    await denied("authenticated", A, "insert into public.players (auth_user_id, email, name) values ($1, 'a2@example.com', 'a2')", [A], "23505");
  });

  it("a user cannot delete any row, their own included", async () => {
    for (const id of [pid.a, pid.b]) {
      assert.equal(await affected("authenticated", A, "delete from public.players where id = $1", [id]), 0);
    }
  });

  it("an admin reads everyone and can delete", async () => {
    const rows = await visible("authenticated", ADMIN, "select id from public.players");
    assert.ok(rows.length >= 3);
    const id = "ffffffff-0000-4000-8000-00000000000f";
    await su("insert into auth.users (id, email) values ($1, 'del@example.com')", [id]);
    assert.equal(await affected("authenticated", ADMIN, "delete from public.players where auth_user_id = $1", [id]), 1);
  });

  it("referral codes are assigned and unique", async () => {
    const { rows } = await su("select referral_code from public.players");
    assert.ok(rows.every((r) => /^[0-9A-F]{8}$/.test(r.referral_code)));
    assert.equal(new Set(rows.map((r) => r.referral_code)).size, rows.length);
  });

  it("my_referral_count counts only the caller's referrals", async () => {
    const code = (await su("select referral_code from public.players where id = $1", [pid.a])).rows[0].referral_code;
    const id = "99999999-0000-4000-8000-000000000009";
    await su("insert into auth.users (id, email, raw_user_meta_data) values ($1, 'ref@example.com', $2)", [id, JSON.stringify({ referred_by: code })]);
    assert.equal(Number((await as("authenticated", A, "select public.my_referral_count() as n")).rows[0].n), 1);
    assert.equal(Number((await as("authenticated", B, "select public.my_referral_count() as n")).rows[0].n), 0);
  });

  it("anon cannot call my_referral_count", async () => {
    await denied("anon", null, "select public.my_referral_count()");
  });
});

describe("trigger functions are not exposed", () => {
  for (const fn of [
    "handle_new_user()",
    "set_player_referral_code()",
    "generate_referral_code()",
    "record_tournament_history()",
  ]) {
    it(`anon and authenticated cannot execute ${fn}`, async () => {
      const { rows } = await su(
        `select has_function_privilege('anon', 'public.${fn}', 'execute') as anon,
                has_function_privilege('authenticated', 'public.${fn}', 'execute') as auth`,
      );
      assert.deepEqual(rows[0], { anon: false, auth: false });
    });
  }

  it("signup still works with execute revoked", async () => {
    const id = "88888888-0000-4000-8000-000000000008";
    await su("insert into auth.users (id, email) values ($1, 'still@example.com')", [id]);
    assert.equal(await count("select count(*)::int as n from public.players where auth_user_id = $1", [id]), 1);
  });
});

describe("feedback", () => {
  const ins = "insert into public.feedback (player_id, rating, comment, page_url) values ($1, 5, 'hi', '/x')";

  it("anon can submit anonymous feedback", async () => {
    assert.equal(await affected("anon", null, ins, [null]), 1);
  });

  it("anon cannot attribute feedback to a player", async () => {
    await denied("anon", null, ins, [pid.a]);
  });

  it("a user can attribute feedback to themselves but not to someone else", async () => {
    assert.equal(await affected("authenticated", A, ins, [pid.a]), 1);
    await denied("authenticated", A, ins, [pid.b]);
  });

  it("nobody but the service role can read, edit or delete feedback", async () => {
    for (const [role, sub] of [["anon", null], ["authenticated", A], ["authenticated", ADMIN]]) {
      assert.deepEqual(await visible(role, sub, "select id from public.feedback"), []);
      assert.equal(await affected(role, sub, "update public.feedback set comment = 'x'"), 0);
      assert.equal(await affected(role, sub, "delete from public.feedback"), 0);
    }
    assert.ok((await count("select count(*)::int as n from public.feedback")) >= 2);
  });

  it("rejects absurdly large comments and urls", async () => {
    await denied("anon", null, "insert into public.feedback (rating, comment, page_url) values (5, repeat('x', 100000), '/x')", [], "23514");
    await denied("anon", null, "insert into public.feedback (rating, page_url) values (5, repeat('x', 100000))", [], "23514");
  });
});

describe("docs", () => {
  const post = (slug, createdAt = null) => [
    `insert into public.docs (slug, title, content, author_type, author_player_id, author_display_name, created_at)
     values ($2, 't', 'c', 'user', $1, 'x', coalesce($3::timestamptz, now()))`,
    (id) => [id, slug, createdAt],
  ];
  const run = (sub, id, slug, createdAt) => {
    const [sql, args] = post(slug, createdAt);
    return affected("authenticated", sub, sql, args(id));
  };

  it("anon reads published docs only", async () => {
    await su("insert into public.docs (slug,title,content,author_type,author_display_name,status) values ('hidden','t','c','maintainer','m','unpublished')");
    const rows = await visible("anon", null, "select slug, status from public.docs");
    assert.ok(rows.length >= 7);
    assert.ok(rows.every((r) => r.status === "published"));
  });

  it("a user cannot post as a maintainer", async () => {
    await denied("authenticated", A, "insert into public.docs (slug,title,content,author_type,author_display_name) values ('m1','t','c','maintainer','TourneyRadar maintainers')");
  });

  it("a user cannot post as another player", async () => {
    const [sql, args] = post("as-bob");
    await denied("authenticated", A, sql, args(pid.b));
  });

  it("anon cannot post", async () => {
    const [sql, args] = post("anon-doc");
    await denied("anon", null, sql, args(pid.a));
  });

  it("the cap is two per author per week, counted per author", async () => {
    assert.equal(await run(A, pid.a, "a1"), 1);
    assert.equal(await run(A, pid.a, "a2"), 1);
    const [sql, args] = post("a3");
    await denied("authenticated", A, sql, args(pid.a));
    // Bob is unaffected by Alice's two (the pre-fix policy counted everyone).
    assert.equal(await run(B, pid.b, "b1"), 1);
  });

  it("the cap cannot be dodged by backdating created_at", async () => {
    const before = await count("select count(*)::int as n from public.docs where author_player_id = $1", [pid.b]);
    for (const s of ["b-old1", "b-old2", "b-old3", "b-old4"]) {
      await run(B, pid.b, s, "2000-01-01").catch(() => {});
    }
    const gained = (await count("select count(*)::int as n from public.docs where author_player_id = $1", [pid.b])) - before;
    assert.ok(gained <= 1, `Bob got ${gained} extra docs past the cap`);
  });

  it("client-supplied timestamps are overwritten", async () => {
    assert.equal(
      await count("select count(*)::int as n from public.docs where author_type = 'user' and created_at < now() - interval '1 day'"),
      0,
    );
  });

  it("users cannot edit or delete docs", async () => {
    for (const [role, sub] of [["anon", null], ["authenticated", A]]) {
      assert.equal(await affected(role, sub, "update public.docs set title = 'pwned'"), 0);
      assert.equal(await affected(role, sub, "delete from public.docs"), 0);
    }
  });

  it("rejects absurdly large doc bodies", async () => {
    await denied("authenticated", ADMIN, "insert into public.docs (slug,title,content,author_type,author_player_id,author_display_name) values ('big','t',repeat('x',1000000),'user',$1,'Admin')", [pid.admin], "23514");
  });
});

describe("tournaments, history and read-only tables", () => {
  it("anon cannot write tournaments", async () => {
    await denied("anon", null, "insert into public.tournaments (id, name) values ('t1', 'x')");
  });

  it("a service-role write is recorded in history, and history is public read-only", async () => {
    await as("service_role", null, "insert into public.tournaments (id, name) values ('t1', 'Open')");
    await as("service_role", null, "update public.tournaments set name = 'Open 2' where id = 't1'");
    const rows = await visible("anon", null, "select tournament_id from public.tournament_history where tournament_id = 't1'");
    assert.equal(rows.length, 2);
    for (const [role, sub] of [["anon", null], ["authenticated", A]]) {
      assert.equal(await affected(role, sub, "update public.tournament_history set snapshot = '{}'"), 0);
      assert.equal(await affected(role, sub, "delete from public.tournament_history"), 0);
    }
  });

  const inserts = {
    scraper_logs: "insert into public.scraper_logs (status) values ('success')",
    fide_rating_history: "insert into public.fide_rating_history (fide_id, period) values ('1', '2026-Jan')",
    tournament_history: "insert into public.tournament_history (tournament_id, snapshot) values ('x', '{}')",
  };
  for (const [table, stmt] of Object.entries(inserts)) {
    it(`${table}: public read, no client writes`, async () => {
      assert.ok(Array.isArray(await visible("anon", null, `select * from public.${table}`)));
      await denied("anon", null, stmt);
      await denied("authenticated", A, stmt);
    });
  }
});
