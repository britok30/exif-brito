// Rewrites stored photo URLs from one storage base URL to another, after the
// objects themselves have been copied (for example S3 → Cloudflare R2).
//
//   node scripts/migrate-storage-urls.mjs <old-base-url> <new-base-url> [--apply]
//
// Without --apply it only reports what would change.
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const [oldBase, newBase, flag] = process.argv.slice(2);
if (!oldBase || !newBase) {
  console.error('usage: node scripts/migrate-storage-urls.mjs <old-base-url> <new-base-url> [--apply]');
  process.exit(1);
}
const trim = value => value.replace(/\/+$/, '');
const from = trim(oldBase);
const to = trim(newBase);
const apply = flag === '--apply';
const sql = neon(process.env.DATABASE_URL);

const [counts] = await sql.query(
  `select count(*) filter (where url like $1) as urls,
          count(*) filter (where thumbnail_url like $1) as thumbnails,
          count(*) filter (where url not like $1 and url not like $2) as unknown
   from photos`,
  [`${from}/%`, `${to}/%`],
);
console.log(`${counts.urls} originals and ${counts.thumbnails} display copies point at ${from}`);
if (Number(counts.unknown) > 0) console.log(`${counts.unknown} originals point somewhere else and will be left alone`);

if (!apply) { console.log('Dry run. Re-run with --apply to rewrite them.'); process.exit(0); }

const rows = await sql.query(
  `update photos set
     url = overlay(url placing $2 from 1 for length($1)),
     thumbnail_url = case when thumbnail_url like $3 then overlay(thumbnail_url placing $2 from 1 for length($1)) else thumbnail_url end,
     updated_at = now()
   where url like $3 or thumbnail_url like $3
   returning id`,
  [from, to, `${from}/%`],
);
console.log(`Rewrote ${rows.length} photographs to ${to}`);
