import type { NextRequest } from 'next/server';
import { bearerToken, clientForToken, serviceRoleClient } from '@/lib/supabase-server';

// The admin gate for server routes (issue #263).
//
// An admin is a signed-in Supabase user whose auth id has a row in the existing
// `admins` table (the same table lib/AuthContext.tsx and the RLS policies use).
// No role claim, no new column, no environment allow-list.
//
// Two steps, and the second never runs unless the first succeeded:
//   1. The bearer token is verified with Supabase Auth, which yields the user id.
//   2. That id, and nothing from the request body, query or headers, is looked up
//      in `admins` with the service role. The browser never holds that key, and
//      the lookup does not depend on which `admins` policies the project has.
//
// Everything that is not a clear "yes" is a "no": a missing or bad token is 401,
// a valid user who is not in `admins` is 403, and a failure while checking (the
// database is down, the key is missing) is a 500 that grants nothing.

export type AdminAuth =
  | { ok: true; authUserId: string }
  | { ok: false; status: 401 | 403 | 500; error: string };

export interface AdminGateDeps {
  /** The auth user id the token proves, or null for a missing, invalid or expired token. */
  verifyToken(token: string): Promise<string | null>;
  /** Whether this auth user id has a row in `admins`. Throws if it cannot tell. */
  isAdmin(authUserId: string): Promise<boolean>;
}

export const adminGateDeps: AdminGateDeps = {
  async verifyToken(token) {
    const {
      data: { user },
      error,
    } = await clientForToken(token).auth.getUser(token);
    return error || !user ? null : user.id;
  },
  async isAdmin(authUserId) {
    const { data, error } = await serviceRoleClient()
      .from('admins')
      .select('auth_user_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (error) throw new Error(`Admin lookup failed: ${error.message}`);
    return data !== null;
  },
};

export async function authorizeAdmin(
  request: NextRequest,
  deps: AdminGateDeps = adminGateDeps
): Promise<AdminAuth> {
  const unauthorized: AdminAuth = { ok: false, status: 401, error: 'Authentication required' };

  let token: string | null;
  try {
    token = bearerToken(request);
  } catch {
    return unauthorized;
  }
  if (!token) return unauthorized;

  let authUserId: string | null;
  try {
    authUserId = await deps.verifyToken(token);
  } catch {
    return { ok: false, status: 500, error: 'Could not verify your session' };
  }
  if (!authUserId) return unauthorized;

  let admin: boolean;
  try {
    admin = await deps.isAdmin(authUserId);
  } catch {
    return { ok: false, status: 500, error: 'Could not verify admin access' };
  }
  if (admin !== true) return { ok: false, status: 403, error: 'Admin access required' };

  return { ok: true, authUserId };
}
