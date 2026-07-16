/**
 * Step 1 of the legacy migration: load a phpMyAdmin/MySQL dump into a temporary database
 * (`legacy_lebbis` by default) so it can be queried and transformed by migrate-legacy.ts.
 *
 *   npx tsx scripts/import-legacy-dump.ts "<path-to-dump.sql>" [target-db-name]
 *
 * Then run:  npx tsx scripts/migrate-legacy.ts <tenant-slug> --commit
 */
import { readFileSync } from "fs";
import mysql from "mysql2/promise";

const dumpPath = process.argv[2];
const targetDb = process.argv[3] ?? "legacy_lebbis";
if (!dumpPath) {
  console.error('Usage: npx tsx scripts/import-legacy-dump.ts "<path-to-dump.sql>" [target-db-name]');
  process.exit(1);
}

function serverCfg() {
  const env = readFileSync(".env", "utf8");
  const line = env.split(/\r?\n/).find((l) => l.trim().startsWith("DATABASE_URL"))!;
  const raw = line.replace(/^\s*DATABASE_URL\s*=\s*/, "").replace(/^["']|["']$/g, "").trim();
  const u = new URL(raw);
  return {
    host: u.hostname, port: Number(u.port || 3306),
    user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
    multipleStatements: true as const
  };
}

async function main() {
  const conn = await mysql.createConnection(serverCfg());
  await conn.query(`DROP DATABASE IF EXISTS \`${targetDb}\``);
  await conn.query(`CREATE DATABASE \`${targetDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
  await conn.changeUser({ database: targetDb });
  await conn.query(readFileSync(dumpPath, "utf8"));
  const [tables] = await conn.query<any[]>(
    `SELECT COUNT(*) n FROM information_schema.tables WHERE table_schema='${targetDb}'`
  );
  console.log(`✓ Imported dump into \`${targetDb}\` (${(tables as any[])[0].n} tables).`);
  await conn.end();
}

main().catch((e) => { console.error("✗ Import failed:", e instanceof Error ? e.message : e); process.exit(1); });
