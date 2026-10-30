#!/usr/bin/env node
import assert from 'node:assert/strict';
import { getCountdown } from './countdown.ts';

// 1. A date equal to today returns "Starting today!" at any time of day.
assert.equal(getCountdown('2026-10-24', new Date('2026-10-24T00:00:00Z')), 'Starting today!');
assert.equal(getCountdown('2026-10-24', new Date('2026-10-24T09:00:00Z')), 'Starting today!');
assert.equal(getCountdown('2026-10-24', new Date('2026-10-24T23:59:59Z')), 'Starting today!');

// 2. The day before returns "Tomorrow", never "Starting in Nh".
assert.equal(getCountdown('2026-10-24', new Date('2026-10-23T00:00:00Z')), 'Tomorrow');
assert.equal(getCountdown('2026-10-24', new Date('2026-10-23T09:00:00Z')), 'Tomorrow');
assert.equal(getCountdown('2026-10-24', new Date('2026-10-23T23:59:59Z')), 'Tomorrow');

// 3. Days within a week return "In N days".
assert.equal(getCountdown('2026-10-26', new Date('2026-10-24T12:00:00Z')), 'In 2 days');
assert.equal(getCountdown('2026-10-31', new Date('2026-10-24T12:00:00Z')), 'In 7 days');

// 4. Days up to 30 return "In N weeks".
assert.equal(getCountdown('2026-11-01', new Date('2026-10-24T12:00:00Z')), 'In 2 weeks');
assert.equal(getCountdown('2026-11-20', new Date('2026-10-24T12:00:00Z')), 'In 4 weeks');

// 5. 31 days returns "In 1 month"; 60 days returns "In 2 months".
assert.equal(getCountdown('2026-11-24', new Date('2026-10-24T00:00:00Z')), 'In 1 month');
assert.equal(getCountdown('2026-12-23', new Date('2026-10-24T00:00:00Z')), 'In 2 months');

// 6. Past dates return "".
assert.equal(getCountdown('2026-10-23', new Date('2026-10-24T09:00:00Z')), '');
assert.equal(getCountdown('2026-10-01', new Date('2026-10-24T00:00:00Z')), '');

// 7. Invalid dates or empty input return "".
assert.equal(getCountdown(''), '');
assert.equal(getCountdown('invalid-date'), '');

console.log('✔ All countdown selfchecks passed.');
