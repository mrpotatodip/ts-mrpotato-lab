ALTER TABLE "scans" ADD COLUMN "priors_given" integer;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "priors_carried" integer;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "priors_closed" integer;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "priors_unchecked" integer;