create table billing_groups (
    id integer primary key generated always as identity,
    code text unique not null
);

insert into billing_groups (code)
select distinct "BillingGroupID"
from customers;

alter table customers
add column billing_group_id integer references billing_groups on delete restrict;

update customers c
set billing_group_id = bg.id
from billing_groups bg
where c."BillingGroupID" = bg.code;

alter table customers
alter column billing_group_id set not null;

alter table customers
drop column "BillingGroupID";
