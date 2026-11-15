import { serviceRoleClient } from '@/lib/supabase-server';
import {
  GUARDIAN_LINK_TTL_DAYS,
  hashToken,
  newGuardianToken,
  type AgeBasis,
  type AgeCheckRow,
} from '@/lib/guardian-consent';

// player_age_checks is service-role only (see the migration), so every call
// here goes through the service client and is scoped to a player id the route
// took from the caller's verified token, or to a token hash.

const COLUMNS =
  'age_basis, guardian_email, guardian_token_hash, guardian_requested_at, guardian_expires_at, guardian_send_count, guardian_confirmed_at';

export async function getAgeCheck(playerId: string): Promise<AgeCheckRow | null> {
  const { data, error } = await serviceRoleClient()
    .from('player_age_checks')
    .select(COLUMNS)
    .eq('player_id', playerId)
    .maybeSingle();
  if (error) throw new Error(`Reading age check failed: ${error.message}`);
  return (data as AgeCheckRow | null) ?? null;
}

/** Stores the first answer. Does nothing if one already exists. */
export async function recordAgeBasis(
  playerId: string,
  basis: AgeBasis,
  guardianEmail: string | null
): Promise<void> {
  const { error } = await serviceRoleClient()
    .from('player_age_checks')
    .upsert(
      { player_id: playerId, age_basis: basis, guardian_email: guardianEmail },
      { onConflict: 'player_id', ignoreDuplicates: true }
    );
  if (error) throw new Error(`Saving age check failed: ${error.message}`);
}

/**
 * Creates a new confirmation link for an under-16 account and returns the raw
 * token for the email. Any earlier link stops working because its hash is
 * replaced.
 */
export async function issueGuardianToken(
  playerId: string,
  guardianEmail: string,
  sendCount: number,
  now: Date = new Date()
): Promise<string> {
  const { token, hash } = newGuardianToken();
  const expires = new Date(now.getTime() + GUARDIAN_LINK_TTL_DAYS * 86_400_000);

  const { error } = await serviceRoleClient()
    .from('player_age_checks')
    .update({
      guardian_email: guardianEmail,
      guardian_token_hash: hash,
      guardian_requested_at: now.toISOString(),
      guardian_expires_at: expires.toISOString(),
      guardian_send_count: sendCount + 1,
    })
    .eq('player_id', playerId)
    .is('guardian_confirmed_at', null);
  if (error) throw new Error(`Issuing guardian link failed: ${error.message}`);
  return token;
}

export type ConfirmResult = 'confirmed' | 'invalid' | 'expired';

/** Marks the guardian as confirmed when the emailed token matches. */
export async function confirmGuardianToken(
  token: string,
  now: Date = new Date()
): Promise<ConfirmResult> {
  const client = serviceRoleClient();
  const { data, error } = await client
    .from('player_age_checks')
    .select('player_id, guardian_expires_at, guardian_confirmed_at')
    .eq('guardian_token_hash', hashToken(token))
    .maybeSingle();
  if (error) throw new Error(`Reading guardian link failed: ${error.message}`);
  if (!data) return 'invalid';
  // A second click on the same link, or a mail scanner that got there first.
  if (data.guardian_confirmed_at) return 'confirmed';
  if (!data.guardian_expires_at || new Date(data.guardian_expires_at) <= now) return 'expired';

  const { error: updateError } = await client
    .from('player_age_checks')
    .update({ guardian_confirmed_at: now.toISOString() })
    .eq('player_id', data.player_id)
    .is('guardian_confirmed_at', null);
  if (updateError) throw new Error(`Confirming guardian failed: ${updateError.message}`);
  return 'confirmed';
}
