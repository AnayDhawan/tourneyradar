import { supabase } from './supabase';

function getSessionId(): string {
  const key = 'tr_session';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export async function trackPageView(path: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const session_id = getSessionId();
    await supabase.from('page_views').insert({
      path,
      session_id,
      referrer: document.referrer || null,
    });
  } catch {
    // never throw — tracking is best-effort
  }
}
