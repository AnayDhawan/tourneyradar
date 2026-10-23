import { describe, expect, it } from 'vitest';
import { eventCountLabel } from './og-label';

describe('eventCountLabel', () => {
  it('pluralizes the count', () => {
    expect(eventCountLabel(1)).toBe('1 upcoming tournament');
    expect(eventCountLabel(42)).toBe('42 upcoming tournaments');
  });

  it('groups thousands', () => {
    expect(eventCountLabel(1234)).toBe('1,234 upcoming tournaments');
  });

  it('falls back to a neutral line when there are none', () => {
    expect(eventCountLabel(0)).toBe('Chess tournaments worldwide');
    expect(eventCountLabel(-1)).toBe('Chess tournaments worldwide');
  });
});
