import { describe, expect, it, vi } from 'vitest';
import {
  buildTournamentShare,
  copyWithTextarea,
  shareTournament,
  tournamentShareText,
  tournamentShareUrl,
  type TournamentShareData,
} from './share';

const t = {
  id: 'cr_123',
  name: 'Kolkata Open',
  date: '2026-11-10',
  end_date: '2026-11-12',
  city: 'Kolkata',
};

const data: TournamentShareData = buildTournamentShare(t);

function domError(name: string): Error {
  const err = new Error(name);
  err.name = name;
  return err;
}

describe('tournamentShareUrl', () => {
  it('is the canonical page with no query string or hash', () => {
    expect(tournamentShareUrl('cr_123')).toBe('https://www.tourneyradar.com/tournaments/cr_123');
  });

  it('encodes ids so they cannot add a query string or hash', () => {
    const url = tournamentShareUrl('a?utm_source=x#frag/../b');
    expect(url).not.toMatch(/[?#]/);
    expect(new URL(url).pathname.split('/')).toHaveLength(3);
  });
});

describe('tournamentShareText', () => {
  it('joins name, date range and city', () => {
    expect(tournamentShareText(t)).toBe('Kolkata Open | 10 Nov 2026 - 12 Nov 2026 | Kolkata');
  });

  it('shows one date for a single-day event', () => {
    expect(tournamentShareText({ ...t, end_date: '2026-11-10' })).toBe('Kolkata Open | 10 Nov 2026 | Kolkata');
    expect(tournamentShareText({ ...t, end_date: undefined })).toBe('Kolkata Open | 10 Nov 2026 | Kolkata');
  });

  it('leaves out a missing city and falls back to location', () => {
    expect(tournamentShareText({ ...t, city: undefined })).toBe('Kolkata Open | 10 Nov 2026 - 12 Nov 2026');
    expect(tournamentShareText({ ...t, city: '', location: 'Salt Lake' })).toBe(
      'Kolkata Open | 10 Nov 2026 - 12 Nov 2026 | Salt Lake',
    );
  });

  it('keeps unreadable dates as given instead of throwing', () => {
    expect(tournamentShareText({ ...t, date: 'soon', end_date: undefined, city: undefined })).toBe(
      'Kolkata Open | soon',
    );
  });
});

describe('buildTournamentShare', () => {
  it('carries the title, text and canonical url', () => {
    expect(data).toEqual({
      title: 'Kolkata Open',
      text: 'Kolkata Open | 10 Nov 2026 - 12 Nov 2026 | Kolkata',
      url: 'https://www.tourneyradar.com/tournaments/cr_123',
    });
  });
});

describe('shareTournament', () => {
  it('uses the native share sheet when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    await expect(shareTournament(data, { share, writeText })).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith(data);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('asks canShare first and copies when the data is not shareable', async () => {
    const share = vi.fn();
    const canShare = vi.fn().mockReturnValue(false);
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(shareTournament(data, { share, canShare, writeText })).resolves.toBe('copied');
    expect(canShare).toHaveBeenCalledWith(data);
    expect(share).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith(data.url);
  });

  it('treats a canShare that throws as not shareable', async () => {
    const canShare = vi.fn(() => {
      throw new Error('boom');
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(shareTournament(data, { share: vi.fn(), canShare, writeText })).resolves.toBe('copied');
  });

  it('is silent when the share sheet is dismissed', async () => {
    const share = vi.fn().mockRejectedValue(domError('AbortError'));
    const writeText = vi.fn();
    await expect(shareTournament(data, { share, writeText })).resolves.toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the bare url when sharing fails for another reason', async () => {
    const share = vi.fn().mockRejectedValue(domError('NotAllowedError'));
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(shareTournament(data, { share, writeText })).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('https://www.tourneyradar.com/tournaments/cr_123');
  });

  it('copies when there is no share API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(shareTournament(data, { writeText })).resolves.toBe('copied');
  });

  it('falls back to the legacy copy when the clipboard API is missing or rejects', async () => {
    const legacyCopy = vi.fn().mockReturnValue(true);
    await expect(shareTournament(data, { legacyCopy })).resolves.toBe('copied');
    const writeText = vi.fn().mockRejectedValue(domError('NotAllowedError'));
    await expect(shareTournament(data, { writeText, legacyCopy })).resolves.toBe('copied');
    expect(legacyCopy).toHaveBeenCalledWith(data.url);
  });

  it('reports failure when nothing can copy', async () => {
    await expect(shareTournament(data, {})).resolves.toBe('failed');
    const writeText = vi.fn().mockRejectedValue(domError('NotAllowedError'));
    const legacyCopy = vi.fn().mockReturnValue(false);
    await expect(shareTournament(data, { writeText, legacyCopy })).resolves.toBe('failed');
    const throwing = vi.fn(() => {
      throw new Error('boom');
    });
    await expect(shareTournament(data, { legacyCopy: throwing })).resolves.toBe('failed');
  });
});

describe('copyWithTextarea', () => {
  it('returns false outside a browser', () => {
    expect(copyWithTextarea('x')).toBe(false);
  });
});
