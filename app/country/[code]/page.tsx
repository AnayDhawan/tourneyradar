import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BaseLayout from '../../../components/BaseLayout';
import { generateCountryMetadata, generateBreadcrumbJsonLd, getCountryName, COUNTRY_NAMES } from '../../lib/metadata';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://htohprkfygyzvgzijvnd.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0b2hwcmtmeWd5enZnemlqdm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NDY3MDMsImV4cCI6MjA4MjIyMjcwM30.4TYIhteDvauPVtWbWp_Dql3VgJcYsdhgYq65Z6kGDfA";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Props = {
  params: Promise<{ code: string }>;
};

export async function generateStaticParams() {
  return Object.keys(COUNTRY_NAMES).map((code) => ({
    code: code.toLowerCase(),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const countryCode = code.toUpperCase();
  const countryName = getCountryName(countryCode);
  
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('tournaments')
    .select('*', { count: 'exact', head: true })
    .eq('country_code', countryCode)
    .gte('date', today)
    .eq('status', 'published');

  return generateCountryMetadata(countryCode, countryName, count || 0);
}

async function getTournaments(countryCode: string) {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, name, date, end_date, city, state, country_code, category, fide_rated')
    .eq('country_code', countryCode.toUpperCase())
    .gte('date', today)
    .eq('status', 'published')
    .order('date', { ascending: true })
    .limit(100);

  if (error) return [];
  return data || [];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export default async function CountryPage({ params }: Props) {
  const { code } = await params;
  const countryCode = code.toUpperCase();
  const countryName = getCountryName(countryCode);
  
  if (!COUNTRY_NAMES[countryCode]) {
    notFound();
  }

  const tournaments = await getTournaments(countryCode);

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', url: 'https://www.tourneyradar.com' },
    { name: 'Countries', url: 'https://www.tourneyradar.com/tournaments' },
    { name: countryName, url: `https://www.tourneyradar.com/country/${code}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <BaseLayout
        showHero
        heroTitle={<>Chess Tournaments in <span className="highlight">{countryName}</span></>}
        heroDescription={`Discover ${tournaments.length}+ upcoming chess tournaments in ${countryName}. Find FIDE-rated events near you.`}
      >
        <section className="tournament-section">
          <div className="section-container">
            {tournaments.length === 0 ? (
              <div className="loading-message">
                <p>No upcoming tournaments found in {countryName}.</p>
                <Link href="/tournaments" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                  Browse All Tournaments
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 1fr))', gap: '1.5rem' }}>
                {tournaments.map((tournament) => (
                  <div key={tournament.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                        {tournament.fide_rated && <span className="badge badge-fide">FIDE</span>}
                        <span className="badge">{tournament.category}</span>
                      </div>
                      <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', lineHeight: 1.3 }}>
                        {tournament.name}
                      </h3>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                        <span>Date:</span>
                        <span>{formatDate(tournament.date)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                        <span>Location:</span>
                        <span>{tournament.city || 'TBA'}, {tournament.country_code}</span>
                      </div>
                    </div>

                    <Link
                      href={`/tournaments/${tournament.id}`}
                      className="btn btn-primary"
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
                    >
                      View Details →
                    </Link>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
              <Link href="/tournaments" className="btn" style={{ background: 'var(--surface-elevated)' }}>
                ← Browse All Countries
              </Link>
            </div>
          </div>
        </section>
      </BaseLayout>
    </>
  );
}
