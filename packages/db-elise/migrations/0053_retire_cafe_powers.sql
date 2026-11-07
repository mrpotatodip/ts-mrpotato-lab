DELETE FROM "access_role_powers" WHERE "master_power_id" IN (SELECT "id" FROM "access_master_powers" WHERE "power" ~ '^company:(faqs|hours|menu|profile|widget):');--> statement-breakpoint
DELETE FROM "access_master_powers" WHERE "power" ~ '^company:(faqs|hours|menu|profile|widget):';
