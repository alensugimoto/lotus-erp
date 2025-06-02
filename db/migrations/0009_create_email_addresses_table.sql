create table email_addresses (
  id integer primary key generated always as identity,
  address text unique not null,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz
);
CREATE TRIGGER email_addresses_stamp BEFORE UPDATE ON email_addresses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
