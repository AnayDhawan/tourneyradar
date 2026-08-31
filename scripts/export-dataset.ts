// Open dataset export (issue #130), unblocked by #125's tournament_history
// table landing on main.
//
// Writes the same rows and columns that app/api/dataset/route.ts serves
// live, via the shared shaping logic in lib/dataset.ts. This script exists
// for local/CI generation (e.g. a periodic GitHub Release asset later, or a
// contributor who wants a snapshot on disk); the API route stays the
// primary v1 distribution path since it needs no extra hosting and is
// always fresh. See DATASET.md for the license and attribution terms this
// export is released under.

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fetchDatasetRows, buildDatasetMeta, toCSV, toNDJSON } from '../lib/dataset';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase environment variables.');
  console.error('  Run with: npm run export:dataset');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function getArg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

async function main() {
  const outDir = getArg('--output-dir') ?? path.join('data', 'exports');

  console.log('\n' + '='.repeat(60));
  console.log('  TourneyRadar Open Dataset Export');
  console.log('='.repeat(60) + '\n');

  console.log('  Fetching tournaments...');
  const rows = await fetchDatasetRows(supabase);
  const meta = buildDatasetMeta(rows);

  console.log(`  ${meta.rowCount} rows, ${meta.countryCount} countries, ` +
    `dates ${meta.dateRangeStart ?? 'n/a'} to ${meta.dateRangeEnd ?? 'n/a'}\n`);

  fs.mkdirSync(outDir, { recursive: true });

  const csvPath = path.join(outDir, 'tournaments.csv');
  fs.writeFileSync(csvPath, toCSV(rows), 'utf8');
  console.log(`  Wrote ${csvPath}`);

  const ndjsonPath = path.join(outDir, 'tournaments.ndjson');
  fs.writeFileSync(ndjsonPath, toNDJSON(rows), 'utf8');
  console.log(`  Wrote ${ndjsonPath}`);

  const metaPath = path.join(outDir, 'meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
  console.log(`  Wrote ${metaPath}`);

  console.log('\n' + '='.repeat(60));
  console.log(`  DONE: ${meta.rowCount} tournaments exported`);
  console.log('='.repeat(60) + '\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
