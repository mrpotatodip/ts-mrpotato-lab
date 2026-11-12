-- A limited role for the Worker. It cannot bypass row-level security, own a table or change the schema.
-- No password and no login here: an operator sets both once, outside git (see packages/db-elise/README.md).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'elise_app') THEN
    CREATE ROLE elise_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO elise_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO elise_app;--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO elise_app;--> statement-breakpoint
-- Tables and sequences that later migrations create reach elise_app without a new grant.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO elise_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO elise_app;--> statement-breakpoint
-- A runaway query or a lock wait stops after 30 seconds instead of running without limit.
ALTER ROLE elise_app SET statement_timeout = '30s';--> statement-breakpoint
ALTER ROLE elise_app SET lock_timeout = '10s';--> statement-breakpoint
ALTER ROLE elise_app SET idle_in_transaction_session_timeout = '60s';
