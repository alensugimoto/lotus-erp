CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
    BEGIN
        NEW.update_at := now();
        RETURN NEW;
    END;
$$ LANGUAGE plpgsql;
