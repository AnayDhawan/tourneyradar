import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics, logEvent, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Analytics (client-side only)
let analytics: any = null;

export async function initAnalytics() {
  if (typeof window !== 'undefined' && await isSupported()) {
    analytics = getAnalytics(app);
  }
  return analytics;
}

export function trackPageView(pagePath: string, pageTitle?: string) {
  if (analytics) {
    logEvent(analytics, 'page_view', {
      page_path: pagePath,
      page_title: pageTitle
    });
  }
}

export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (analytics) {
    logEvent(analytics, eventName, params);
  }
}

// Specific events
export function trackTournamentView(tournamentId: string, tournamentName: string) {
  trackEvent('view_tournament', {
    tournament_id: tournamentId,
    tournament_name: tournamentName
  });
}

export function trackViewSource(tournamentId: string, source: string, sourceUrl: string) {
  trackEvent('view_source', {
    tournament_id: tournamentId,
    source,
    source_url: sourceUrl
  });
}

export function trackFilter(filterType: string, filterValue: string) {
  trackEvent('use_filter', {
    filter_type: filterType,
    filter_value: filterValue
  });
}

export function trackWishlist(action: 'add' | 'remove', tournamentId: string) {
  trackEvent('wishlist_action', {
    action,
    tournament_id: tournamentId
  });
}

export function trackSearch(query: string, resultsCount: number) {
  trackEvent('search', {
    search_term: query,
    results_count: resultsCount
  });
}
