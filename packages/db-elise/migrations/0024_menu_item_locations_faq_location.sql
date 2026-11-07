CREATE TABLE "tenant_menu_item_locations" (
	"tenant_id" uuid NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"is_available" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_menu_item_locations_menu_item_id_location_id_pk" PRIMARY KEY("menu_item_id","location_id")
);
--> statement-breakpoint
ALTER TABLE "tenant_faqs" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "tenant_menu_items" ADD COLUMN "available_at_all_locations" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_menu_item_locations" ADD CONSTRAINT "tenant_menu_item_locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_menu_item_locations" ADD CONSTRAINT "tenant_menu_item_locations_item_in_tenant_fk" FOREIGN KEY ("menu_item_id","tenant_id") REFERENCES "public"."tenant_menu_items"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_menu_item_locations" ADD CONSTRAINT "tenant_menu_item_locations_location_in_tenant_fk" FOREIGN KEY ("location_id","tenant_id") REFERENCES "public"."tenant_locations"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tenant_menu_item_locations_tenant" ON "tenant_menu_item_locations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_menu_item_locations_location" ON "tenant_menu_item_locations" USING btree ("location_id");--> statement-breakpoint
ALTER TABLE "tenant_faqs" ADD CONSTRAINT "tenant_faqs_location_in_tenant_fk" FOREIGN KEY ("location_id","tenant_id") REFERENCES "public"."tenant_locations"("id","tenant_id") ON DELETE cascade ON UPDATE no action;