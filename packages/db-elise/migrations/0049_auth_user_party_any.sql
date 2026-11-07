ALTER TABLE "auth_user" DROP CONSTRAINT "auth_user_party_id_party_persons_party_id_fk";
--> statement-breakpoint
ALTER TABLE "auth_user" ADD CONSTRAINT "auth_user_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE restrict ON UPDATE no action;