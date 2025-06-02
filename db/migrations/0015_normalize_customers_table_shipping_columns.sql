alter table customers
add column shipping_address_id integer references physical_addresses on delete restrict;

update customers c
set shipping_address_id = a.id
from physical_addresses a
where 
a.address_title = c."ShipToName" and
a.address_line_1 = c."ShipToAddress" and
a.address_line_2 is null and
a.city = c."ShipToCity" and
a.state = c."ShipToProvinceState" and
a.zip_code = c."ShipToPostalCode" and
a.phone_number = c."ShipToTelephone";

alter table customers
alter column shipping_address_id set not null;

alter table customers
drop column "ShipToName";
alter table customers
drop column "ShipToAddress";
alter table customers
drop column "ShipToCity";
alter table customers
drop column "ShipToProvinceState";
alter table customers
drop column "ShipToPostalCode";
alter table customers
drop column "ShipToTelephone";
