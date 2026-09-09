/**
 * PHASE 1 — Seed the real course/syllabus/book catalogue into the database.
 *
 * Usage (from server/):
 *   DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/pak_test_db npm run db:catalog
 *   DATABASE_URL=... npm run db:catalog:validate   # validate only — no DB writes
 *
 * Behaviour:
 *   • validateCatalogFiles() runs FIRST and aborts before any write on error.
 *   • Everything runs inside ONE transaction (BEGIN/COMMIT/ROLLBACK).
 *   • Idempotent: rows are matched by natural keys and updated in place;
 *     re-running never duplicates and never reverts admin lifecycle choices
 *     (status/isActive/archive etc. are untouched by updates).
 */
import { validateCatalogFiles, applyCatalog } from './loadCatalog';
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Auto-load server/.env so the seeder works without an exported DATABASE_URL.
// dotenv never overwrites variables already set in the shell — shell wins.
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const VALIDATE_ONLY = process.argv.includes('--validate');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required (see server/.env.example)');

  // 1) pure validation (no DB)
  const report = validateCatalogFiles();
  if (report.warnings.length) {
    console.log(`── Catalog warnings (${report.warnings.length}) ──`);
    for (const w of report.warnings) console.log(`  ⚠ ${w}`);
  }
  if (report.errors.length) {
    console.error(`✖ Catalog validation FAILED (${report.errors.length} errors):`);
    for (const e of report.errors) console.error(`  ✖ ${e}`);
    process.exit(1);
  }
  console.log('✔ Catalog files valid (no structural errors).');
  if (VALIDATE_ONLY) return;

  // 2) apply within one transaction
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('BEGIN');
    const stats = await applyCatalog(client);
    await client.query('COMMIT');
    console.log('✔ Catalogue seeded/refreshed in one committed transaction:');
    console.log(JSON.stringify(stats, null, 2));
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    console.error('✖ Seed failed — transaction rolled back. No partial catalogue was written.');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
