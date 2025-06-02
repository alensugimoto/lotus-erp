create table fax_numbers (
  id integer primary key generated always as identity,
  number text unique not null,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz
);
CREATE TRIGGER fax_numbers_stamp BEFORE UPDATE ON fax_numbers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
