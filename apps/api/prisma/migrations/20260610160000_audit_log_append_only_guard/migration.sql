CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger AS $$
BEGIN
    IF current_setting('buhta.allow_audit_log_mutation', true) = 'on' THEN
        IF TG_OP = 'UPDATE' THEN
            RETURN NEW;
        END IF;

        RETURN OLD;
    END IF;

    RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_append_only_guard
BEFORE UPDATE OR DELETE ON "audit_log"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_mutation();
