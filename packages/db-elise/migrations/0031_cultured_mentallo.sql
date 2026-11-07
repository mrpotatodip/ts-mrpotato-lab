CREATE TABLE "role_powers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"power" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "role_powers" ADD CONSTRAINT "role_powers_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_role_powers_role_power" ON "role_powers" USING btree ("role_id","power");--> statement-breakpoint
CREATE INDEX "idx_role_powers_role_id" ON "role_powers" USING btree ("role_id");--> statement-breakpoint
INSERT INTO "role_powers" ("role_id", "power")
SELECT r.id, p.power
FROM "roles" r
CROSS JOIN (VALUES
    ('company:profile:business_profile:read'),
    ('company:profile:business_profile:update'),
    ('company:profile:countries:read'),
    ('company:profile:countries:create'),
    ('company:profile:countries:update'),
    ('company:profile:countries:archive'),
    ('company:profile:locations:read'),
    ('company:profile:locations:create'),
    ('company:profile:locations:update'),
    ('company:profile:locations:archive'),
    ('company:profile:region:read'),
    ('company:profile:region:update'),
    ('company:team:members:read'),
    ('company:team:members:update'),
    ('company:team:members:delete'),
    ('company:team:invites:read'),
    ('company:team:invites:create'),
    ('company:team:invites:update'),
    ('company:team:invites:delete'),
    ('company:menu:categories:read'),
    ('company:menu:categories:create'),
    ('company:menu:categories:update'),
    ('company:menu:categories:delete'),
    ('company:menu:categories:reorder'),
    ('company:menu:items:read'),
    ('company:menu:items:create'),
    ('company:menu:items:update'),
    ('company:menu:items:delete'),
    ('company:menu:items:reorder'),
    ('company:menu:country_prices:read'),
    ('company:menu:country_prices:update'),
    ('company:menu:images:read'),
    ('company:menu:images:create'),
    ('company:menu:images:update'),
    ('company:menu:images:delete'),
    ('company:menu:images:reorder'),
    ('company:menu:imports:read'),
    ('company:menu:imports:create'),
    ('company:menu:imports:publish'),
    ('company:menu:import_drafts:read'),
    ('company:menu:import_drafts:update'),
    ('company:faqs:faqs:read'),
    ('company:faqs:faqs:create'),
    ('company:faqs:faqs:update'),
    ('company:faqs:faqs:delete'),
    ('company:faqs:categories:read'),
    ('company:faqs:categories:create'),
    ('company:faqs:categories:update'),
    ('company:faqs:categories:delete'),
    ('company:chats:threads:read'),
    ('company:unanswered:questions:read'),
    ('company:unanswered:questions:dismiss'),
    ('company:assistant:threads:read'),
    ('company:assistant:threads:create'),
    ('company:assistant:threads:update'),
    ('company:assistant:threads:delete'),
    ('store:hours:weekly:read'),
    ('store:hours:weekly:update'),
    ('store:hours:overrides:read'),
    ('store:hours:overrides:create'),
    ('store:hours:overrides:update'),
    ('store:hours:overrides:delete'),
    ('store:menu:availability:read'),
    ('store:menu:availability:update'),
    ('integration:widget:origins:read'),
    ('integration:widget:origins:update'),
    ('integration:widget:look:read'),
    ('integration:widget:look:update')
) AS p(power)
WHERE r.key = 'tenant_admin';
--> statement-breakpoint
INSERT INTO "role_powers" ("role_id", "power")
SELECT r.id, p.power
FROM "roles" r
CROSS JOIN (VALUES
    ('company:profile:business_profile:read'),
    ('company:profile:business_profile:update'),
    ('company:profile:countries:read'),
    ('company:profile:countries:create'),
    ('company:profile:countries:update'),
    ('company:profile:countries:archive'),
    ('company:profile:locations:read'),
    ('company:profile:locations:create'),
    ('company:profile:locations:update'),
    ('company:profile:locations:archive'),
    ('company:profile:region:read'),
    ('company:profile:region:update'),
    ('company:team:members:read'),
    ('company:team:invites:read'),
    ('company:menu:categories:read'),
    ('company:menu:categories:create'),
    ('company:menu:categories:update'),
    ('company:menu:categories:delete'),
    ('company:menu:categories:reorder'),
    ('company:menu:items:read'),
    ('company:menu:items:create'),
    ('company:menu:items:update'),
    ('company:menu:items:delete'),
    ('company:menu:items:reorder'),
    ('company:menu:country_prices:read'),
    ('company:menu:country_prices:update'),
    ('company:menu:images:read'),
    ('company:menu:images:create'),
    ('company:menu:images:update'),
    ('company:menu:images:delete'),
    ('company:menu:images:reorder'),
    ('company:menu:imports:read'),
    ('company:menu:imports:create'),
    ('company:menu:imports:publish'),
    ('company:menu:import_drafts:read'),
    ('company:menu:import_drafts:update'),
    ('company:faqs:faqs:read'),
    ('company:faqs:faqs:create'),
    ('company:faqs:faqs:update'),
    ('company:faqs:faqs:delete'),
    ('company:faqs:categories:read'),
    ('company:faqs:categories:create'),
    ('company:faqs:categories:update'),
    ('company:faqs:categories:delete'),
    ('company:chats:threads:read'),
    ('company:unanswered:questions:read'),
    ('company:unanswered:questions:dismiss'),
    ('company:assistant:threads:read'),
    ('company:assistant:threads:create'),
    ('company:assistant:threads:update'),
    ('company:assistant:threads:delete'),
    ('store:hours:weekly:read'),
    ('store:hours:weekly:update'),
    ('store:hours:overrides:read'),
    ('store:hours:overrides:create'),
    ('store:hours:overrides:update'),
    ('store:hours:overrides:delete'),
    ('store:menu:availability:read'),
    ('store:menu:availability:update'),
    ('integration:widget:origins:read'),
    ('integration:widget:origins:update'),
    ('integration:widget:look:read'),
    ('integration:widget:look:update')
) AS p(power)
WHERE r.key = 'store_admin';
--> statement-breakpoint
INSERT INTO "role_powers" ("role_id", "power")
SELECT r.id, p.power
FROM "roles" r
CROSS JOIN (VALUES
    ('company:profile:business_profile:read'),
    ('company:profile:countries:read'),
    ('company:profile:locations:read'),
    ('company:profile:region:read'),
    ('company:team:members:read'),
    ('company:team:invites:read'),
    ('company:menu:categories:read'),
    ('company:menu:items:read'),
    ('company:menu:country_prices:read'),
    ('company:menu:images:read'),
    ('company:menu:imports:read'),
    ('company:menu:import_drafts:read'),
    ('company:faqs:faqs:read'),
    ('company:faqs:categories:read'),
    ('company:chats:threads:read'),
    ('company:unanswered:questions:read'),
    ('company:assistant:threads:read'),
    ('store:hours:weekly:read'),
    ('store:hours:overrides:read'),
    ('store:menu:availability:read'),
    ('integration:widget:origins:read'),
    ('integration:widget:look:read'),
    ('company:unanswered:questions:dismiss'),
    ('company:assistant:threads:create'),
    ('company:assistant:threads:update'),
    ('company:assistant:threads:delete')
) AS p(power)
WHERE r.key = 'store_staff';
--> statement-breakpoint
INSERT INTO "role_powers" ("role_id", "power")
SELECT r.id, p.power
FROM "roles" r
CROSS JOIN (VALUES
    ('platform:admin:invite_codes:read'),
    ('platform:admin:invite_codes:create'),
    ('platform:admin:invite_codes:delete')
) AS p(power)
WHERE r.key = 'superuser';
--> statement-breakpoint
ALTER TABLE "roles" DROP COLUMN "can_edit";--> statement-breakpoint
ALTER TABLE "roles" DROP COLUMN "can_manage_team";
