#!/usr/bin/env node
/**
 * Local migration runner for the Prisma-style SQL migration folders.
 *
 * WHY: the sandbox cannot run `prisma migrate` (engine binaries are not
 * downloadable here), so the migration folders under
 * server/prisma/migrations (each a timestamp-prefixed folder holding a
 * migration.sql) are applied by this runner via node-pg.
 *
 * Behaviour:
 *   • Records applied folders in a small `_schema_migrations` table.
 *   • Applies pending folders in lexicographic order (same convention as
 *     Prisma), one SQL statement at a time with autocommit — required so
 *     `ALTER TYPE ... ADD VALUE` statements never share a transaction with
 *     statements that use the new value.
 *   • `--baseline <dir>...` marks existing folders as applied WITHOUT running
 *     them (for databases that already carry the Phase-1 catalog changes,
 *     which were applied before this runner existed).
 *
 * Usage:
 *   DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/pak_test_db \
 *     node scripts/apply-migrations.js [--baseline 20240101000000_init ...]
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'prisma', 'migrations');

function splitStatements(sql) {
  // Statements are plain ALTER/CREATE/UPDATE SQL separated by ';' at line
  // ends. Comment lines (--) are dropped first. This runner never executes
  // plpgsql bodies, so a naive split is safe here.
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const args = process.argv.slice(2);
  const baseIdx = args.indexOf('--baseline');
  const baselineDirs = baseIdx >= 0 ? args.slice(baseIdx + 1) : [];

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS "_schema_migrations" (
      "name" TEXT PRIMARY KEY,
      "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

    for (const dir of baselineDirs) {
      const sqlPath = path.join(MIGRATIONS_DIR, dir, 'migration.sql');
      if (!fs.existsSync(sqlPath)) throw new Error(`baseline folder not found: ${dir}`);
      await client.query(`INSERT INTO "_schema_migrations" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING`, [dir]);
      console.log(`✔ baseline recorded: ${dir}`);
    }

    const dirs = fs
      .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && fs.existsSync(path.join(MIGRATIONS_DIR, d.name, 'migration.sql')))
      .map((d) => d.name)
      .sort();

    const { rows } = await client.query('SELECT "name" FROM "_schema_migrations"');
    const applied = new Set(rows.map((r) => r.name));

    for (const dir of dirs) {
      if (applied.has(dir)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, dir, 'migration.sql'), 'utf8');
      const stmts = splitStatements(sql);
      console.log(`▶ applying ${dir} (${stmts.length} statements)`);
      for (const stmt of stmts) {
        await client.query(stmt);
      }
      await client.query(`INSERT INTO "_schema_migrations" ("name") VALUES ($1)`, [dir]);
      console.log(`✔ applied ${dir}`);
    }
    console.log('Migration run complete.');
  } catch (err) {
    console.error('✖ Migration failed — partial statements before the error were applied (autocommit):');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
