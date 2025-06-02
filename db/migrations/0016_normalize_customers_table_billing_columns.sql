alter table customers
add column billing_address_id integer references physical_addresses on delete restrict;

update customers c
set billing_address_id = a.id
from physical_addresses a
where 
a.address_title = c."BillToName" and
a.address_line_1 = c."BillToAddress" and
a.address_line_2 is null and
a.city = c."BillToCity" and
a.state = c."BillToProvinceState" and
a.zip_code = c."BillToPostalCode" and
a.phone_number = c."BillToTelephone";

alter table customers
alter column billing_address_id set not null;

alter table customers
drop column "BillToName";
alter table customers
drop column "BillToAddress";
alter table customers
drop column "BillToCity";
alter table customers
drop column "BillToProvinceState";
alter table customers
drop column "BillToPostalCode";
alter table customers
drop column "BillToTelephone";
