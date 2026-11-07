# Database

## 1. Database: Tables and migrations

- **[House]** A table name starts with its group: `party_`, `tenant_`, `scan_`, `platform_`, `access_`, `auth_`, `chat_bot_`; `parties`, `tenants` and `scans` are the group roots. `pnpm --filter @repo/db-elise check` fails on any other name.
- **[House]** A foreign key to `parties` allows any Party type; a foreign key to `party_persons` or `party_organizations` names the type on purpose.
- **[House]** A catalogue of kinds is a `*_master_*` table with a `key`, not a Postgres enum.
- **[House]** Apply a migration only after `pnpm --filter @repo/db-elise db:rehearse` passes, and only with the owner's approval.
