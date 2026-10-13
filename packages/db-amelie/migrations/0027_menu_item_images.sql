CREATE TABLE "tenant_menu_item_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"name" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tenant_menu_item_images_id_tenant" UNIQUE("id","tenant_id"),
	CONSTRAINT "uq_tenant_menu_item_images_item_sort" UNIQUE("menu_item_id","sort_order"),
	CONSTRAINT "uq_tenant_menu_item_images_object_key" UNIQUE("object_key")
);
--> statement-breakpoint
ALTER TABLE "tenant_menu_item_images" ADD CONSTRAINT "tenant_menu_item_images_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_menu_item_images" ADD CONSTRAINT "tenant_menu_item_images_item_in_tenant_fk" FOREIGN KEY ("menu_item_id","tenant_id") REFERENCES "public"."tenant_menu_items"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tenant_menu_item_images_tenant" ON "tenant_menu_item_images" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_menu_item_images_item" ON "tenant_menu_item_images" USING btree ("menu_item_id");--> statement-breakpoint
ALTER TABLE "tenant_menu_items" DROP COLUMN "image_url";