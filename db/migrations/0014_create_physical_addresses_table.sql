create table physical_addresses (
  id integer primary key generated always as identity,
  address_title text not null,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  state text not null,
  zip_code text not null,
  phone_number text not null,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz,
  unique nulls not distinct (address_title, address_line_1, address_line_2, city, state, zip_code, phone_number)
);
CREATE TRIGGER physical_addresses_stamp BEFORE UPDATE ON physical_addresses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

insert into physical_addresses
(
  address_title,
  address_line_1,
  city,
  state,
  zip_code,
  phone_number
)
select distinct
  "ShipToName",
  "ShipToAddress",
  "ShipToCity",
  "ShipToProvinceState",
  "ShipToPostalCode",
  "ShipToTelephone"
from
  customers
union
select distinct
  "BillToName",
  "BillToAddress",
  "BillToCity",
  "BillToProvinceState",
  "BillToPostalCode",
  "BillToTelephone"
from
  customers;
