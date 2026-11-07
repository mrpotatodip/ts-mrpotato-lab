import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import * as schema from "./schema";

// -----
// Every table name starts with its group, or is a
// group root. See docs/standards/database.md.
// -----
const PREFIXES = ["party_", "tenant_", "scan_", "platform_", "access_", "auth_", "chat_bot_"];
const ROOTS = new Set(["parties", "tenants", "scans"]);

const names = Object.values(schema).flatMap((value) => (is(value, PgTable) ? [getTableConfig(value).name] : []));
const bad = names.filter((name) => !ROOTS.has(name) && !PREFIXES.some((prefix) => name.startsWith(prefix)));

if (bad.length > 0) {
  console.error(`Table names without a group prefix: ${bad.join(", ")}`);
  process.exit(1);
}
console.log(`${names.length} tables, all prefixed`);
