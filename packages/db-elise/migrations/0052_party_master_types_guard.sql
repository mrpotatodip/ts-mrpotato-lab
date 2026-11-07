CREATE FUNCTION "guard_party_master_types_system"() RETURNS trigger AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		IF OLD."is_system" THEN
			RAISE EXCEPTION 'party_master_types: system type % cannot be deleted', OLD."key";
		END IF;
		RETURN OLD;
	END IF;
	IF OLD."is_system" AND (NEW."key" IS DISTINCT FROM OLD."key" OR NEW."is_system" IS DISTINCT FROM OLD."is_system") THEN
		RAISE EXCEPTION 'party_master_types: system type % cannot change its key or lose is_system', OLD."key";
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "trg_party_master_types_system" BEFORE UPDATE OR DELETE ON "party_master_types" FOR EACH ROW EXECUTE FUNCTION "guard_party_master_types_system"();
