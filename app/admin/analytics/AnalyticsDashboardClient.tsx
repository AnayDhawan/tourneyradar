"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Overview {
  total_views: number;
  unique_visitors: number;
  avg_duration_ms: number;
  bounce_rate: number;
}

interface DailyPoint { date: string; views: number; visitors: number }
interface HourlyPoint { hour: number; views: number; visitors: number }
interface PageRow { path: string; views: number; unique_visitors: number }
interface ReferrerRow { domain: string; views: number; unique_visitors: number }
interface CountryRow { code: string; country: string; flag: string; views: number; unique_visitors: number }
interface BreakdownItem { label: string; count: number }
interface Devices { os: BreakdownItem[]; browser: BreakdownItem[]; device: BreakdownItem[] }

type RangePreset = '1d' | '7d' | '30d' | '90d' | 'custom';

// ─── Constants ───────────────────────────────────────────────────────────────

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: '1d',  label: 'Today' },
  { key: '7d',  label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
];

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function toDateStr(d: Date) { return d.toISOString().split('T')[0]; }

function presetToDates(preset: RangePreset): { from: string; to: string } {
  const to = toDateStr(new Date());
  const from = new Date();
  if (preset === '1d')  { return { from: to, to }; }
  if (preset === '7d')  { from.setDate(from.getDate() - 6); }
  else if (preset === '30d') { from.setDate(from.getDate() - 29); }
  else if (preset === '90d') { from.setDate(from.getDate() - 89); }
  return { from: toDateStr(from), to };
}

function fmtDuration(ms: number) {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function fmtNum(n: number) { return n.toLocaleString(); }

// ─── Sub-components ──────────────────────────────────────────────────────────

function SkeletonBlock({ h = 20, w = '60%' }: { h?: number; w?: string }) {
  return (
    <div style={{ height: h, width: w, background: 'var(--border)', borderRadius: 6, margin: '0 auto' }} />
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: '1.75rem 2rem', textAlign: 'center' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{sub}</div>}
    </div>
  );
}

function SectionCard({ title, children, loading }: { title: string; children: React.ReactNode; loading?: boolean }) {
  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: '1.5rem 1.75rem' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[75, 60, 50, 40, 30].map((w, i) => <SkeletonBlock key={i} h={16} w={`${w}%`} />)}
          </div>
        ) : children}
      </div>
    </div>
  );
}

function BarRow({ label, value, max, sub }: { label: string; value: number; max: number; sub?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', borderRadius: 2, transition: 'width 0.4s' }} />
        </div>
      </div>
      <div style={{ textAlign: 'right', minWidth: 60 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmtNum(value)}</div>
        {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
    </div>
  );
}

const HOURLY_LABELS = ['12a','1a','2a','3a','4a','5a','6a','7a','8a','9a','10a','11a','12p','1p','2p','3p','4p','5p','6p','7p','8p','9p','10p','11p'];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', minWidth: 140 }}>
      <div style={{ fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, marginTop: '0.2rem' }}>
          {p.name}: <strong>{fmtNum(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AnalyticsDashboardClient() {
  const { userType, loading: authLoading } = useAuth();

  const [preset, setPreset] = useState<RangePreset>('30d');
  const [from, setFrom] = useState(() => presetToDates('30d').from);
  const [to, setTo]   = useState(() => presetToDates('30d').to);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [hourly, setHourly] = useState<HourlyPoint[]>([]);
  const [hourlyCompare, setHourlyCompare] = useState<HourlyPoint[] | null>(null);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [referrers, setReferrers] = useState<ReferrerRow[]>([]);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [devices, setDevices] = useState<Devices | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async (f: string, t: string) => {
    setLoading(true);
    const q = `from=${f}&to=${t}`;
    const base = '/api/admin/analytics';
    const today = toDateStr(new Date());
    const yesterday = toDateStr(new Date(Date.now() - 86400000));

    try {
      const [ov, d, h, pg, ref, ctr, dev] = await Promise.all([
        fetch(`${base}/overview?${q}`).then(r => r.json()),
        fetch(`${base}/daily?${q}`).then(r => r.json()),
        fetch(`${base}/hourly?date=${today}&compare=${yesterday}`).then(r => r.json()),
        fetch(`${base}/pages?${q}`).then(r => r.json()),
        fetch(`${base}/referrers?${q}`).then(r => r.json()),
        fetch(`${base}/countries?${q}`).then(r => r.json()),
        fetch(`${base}/devices?${q}`).then(r => r.json()),
      ]);

      setOverview(ov);
      setDaily(d.daily ?? []);
      setHourly(h.primary ?? []);
      setHourlyCompare(h.comparison ?? null);
      setPages(pg.pages ?? []);
      setReferrers(ref.referrers ?? []);
      setCountries(ctr.countries ?? []);
      setDevices(dev);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(from, to);
  }, [from, to, fetchAll]);

  const applyPreset = (p: RangePreset) => {
    setPreset(p);
    if (p !== 'custom') {
      const { from: f, to: t } = presetToDates(p);
      setFrom(f);
      setTo(t);
    }
  };

  // Auth guard
  if (!authLoading && userType !== 'admin') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Access Denied</div>
        <p style={{ color: 'var(--text-muted)' }}>Admin access required.</p>
        <Link href="/" className="btn btn-primary">Go Home</Link>
      </div>
    );
  }

  const maxPageViews = pages[0]?.views ?? 1;
  const maxRefViews  = referrers[0]?.views ?? 1;
  const maxCountry   = countries[0]?.views ?? 1;
  const maxOS        = devices?.os[0]?.count ?? 1;
  const maxBrowser   = devices?.browser[0]?.count ?? 1;

  const deviceData = (devices?.device ?? []).map((d, i) => ({ ...d, fill: CHART_COLORS[i % CHART_COLORS.length] }));

  const hourlyMerged = hourly.map((h, i) => ({
    label: HOURLY_LABELS[h.hour],
    today: h.views,
    yesterday: hourlyCompare?.[i]?.views ?? 0,
  }));

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh' }}>
      {/* ── Nav ── */}
      <nav className="glass" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="nav-container">
          <Link href="/" className="nav-brand font-display" style={{ textDecoration: 'none' }}>TourneyRadar</Link>
          <div className="nav-links">
            <Link href="/tournaments" style={{ textDecoration: 'none', color: 'inherit' }}>Tournaments</Link>
            <Link href="/stats" style={{ textDecoration: 'none', color: 'inherit' }}>Stats</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Analytics
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {from === to ? from : `${from} — ${to}`}
            </p>
          </div>

          {/* Date range */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {PRESETS.map(({ key, label }) => (
              <button
                key={key}
                className={`btn${preset === key ? ' btn-primary' : ''}`}
                style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem' }}
                onClick={() => applyPreset(key)}
              >
                {label}
              </button>
            ))}
            <button
              className={`btn${preset === 'custom' ? ' btn-primary' : ''}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem' }}
              onClick={() => setPreset('custom')}
            >
              Custom
            </button>
            {preset === 'custom' && (
              <>
                <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.8125rem' }} />
                <span style={{ color: 'var(--text-muted)' }}>→</span>
                <input type="date" value={to} onChange={e => setTo(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '0.8125rem' }} />
              </>
            )}
          </div>
        </div>

        {/* ── Top stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          {loading || !overview ? (
            [1,2,3,4].map(i => (
              <div key={i} className="card" style={{ padding: '1.75rem 2rem', textAlign: 'center' }}>
                <SkeletonBlock h={12} w="50%" /><div style={{ height: 12 }} /><SkeletonBlock h={36} w="40%" />
              </div>
            ))
          ) : (
            <>
              <StatCard label="Page Views" value={fmtNum(overview.total_views)} />
              <StatCard label="Unique Visitors" value={fmtNum(overview.unique_visitors)} sub="By session" />
              <StatCard label="Avg Duration" value={fmtDuration(overview.avg_duration_ms)} sub="Time on page" />
              <StatCard label="Bounce Rate" value={`${overview.bounce_rate}%`} sub="Single-page sessions" />
            </>
          )}
        </div>

        {/* ── Daily chart ── */}
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem 1.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Traffic over time</h3>
          {loading ? (
            <div style={{ height: 260, background: 'var(--surface-elevated)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Loading…
            </div>
          ) : daily.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={daily} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => { const d = new Date(v + 'T00:00:00'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }}
                  interval={Math.max(0, Math.floor(daily.length / 8))} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.8125rem', paddingTop: '1rem', color: 'var(--text-secondary)' }} />
                <Line type="monotone" dataKey="views" name="Page Views" stroke="var(--primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="visitors" name="Unique Visitors" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No data for this period.</div>
          )}
        </div>

        {/* ── Hourly chart (today vs yesterday) ── */}
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem 1.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Hourly traffic — today vs yesterday</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Hour-by-hour comparison for the last 2 days</p>
          {loading ? (
            <div style={{ height: 220, background: 'var(--surface-elevated)', borderRadius: 8 }} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourlyMerged} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.8125rem', paddingTop: '1rem', color: 'var(--text-secondary)' }} />
                <Bar dataKey="today" name="Today" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="yesterday" name="Yesterday" fill="#94a3b8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Grid: pages + referrers ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>

          <SectionCard title="Top Pages" loading={loading}>
            {pages.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0', fontSize: '0.875rem' }}>No data yet.</p>
            ) : pages.map((p) => (
              <BarRow key={p.path} label={p.path} value={p.views} max={maxPageViews} sub={`${fmtNum(p.unique_visitors)} uniq`} />
            ))}
          </SectionCard>

          <SectionCard title="Referrers" loading={loading}>
            {referrers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0', fontSize: '0.875rem' }}>No data yet.</p>
            ) : referrers.map((r) => (
              <BarRow key={r.domain} label={r.domain} value={r.views} max={maxRefViews} sub={`${fmtNum(r.unique_visitors)} uniq`} />
            ))}
          </SectionCard>
        </div>

        {/* ── Grid: countries + devices ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>

          <SectionCard title="Countries" loading={loading}>
            {countries.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0', fontSize: '0.875rem' }}>No geo data yet. Will populate for future page views.</p>
            ) : countries.map((c) => (
              <BarRow key={c.code} label={`${c.flag} ${c.country}`} value={c.views} max={maxCountry} sub={`${fmtNum(c.unique_visitors)} uniq`} />
            ))}
          </SectionCard>

          <div>
            {/* Device split pie */}
            <div className="card" style={{ marginBottom: '1.25rem', padding: '1.5rem 1.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>Devices</h3>
              {loading || !devices ? (
                <div style={{ height: 180, background: 'var(--surface-elevated)', borderRadius: 8 }} />
              ) : deviceData.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0', fontSize: '0.875rem' }}>No data yet.</p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={deviceData} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={70} strokeWidth={0}>
                        {deviceData.map((d, i) => <Cell key={d.label} fill={d.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmtNum(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {deviceData.map((d, i) => (
                      <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{d.label}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginLeft: 'auto', paddingLeft: '1rem' }}>{fmtNum(d.count)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── OS + Browser ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>

          <SectionCard title="Operating Systems" loading={loading}>
            {!devices || devices.os.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0', fontSize: '0.875rem' }}>No data yet.</p>
            ) : devices.os.map((o) => (
              <BarRow key={o.label} label={o.label} value={o.count} max={maxOS} />
            ))}
          </SectionCard>

          <SectionCard title="Browsers" loading={loading}>
            {!devices || devices.browser.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0', fontSize: '0.875rem' }}>No data yet.</p>
            ) : devices.browser.map((b) => (
              <BarRow key={b.label} label={b.label} value={b.count} max={maxBrowser} />
            ))}
          </SectionCard>
        </div>

      </div>
    </div>
  );
}
