-- TODO: "BillingGroupID"
-- TODO: wrap in transaction

-- create_users_table
create table users (
    "LogonID" text unique not null,
    "Password" text not null,
    "pgORDERS" text not null,
    "pgCUSTOMERS" text not null,
    "pgPRODUCTS" text not null,
    "pgPRICES" text not null,
    "pgTRANSFERS" text not null,
    "pgINVENTORY" text not null,
    "pgADMIN" text not null,
    "pgArchive" text not null,
    "pgLOCATIONS" text not null
);
-- seed_users_table
\copy users from 'db/seeds/tblUsers.csv' with (format csv, header match)

-- normalize_users_table
alter table users
add column id smallint primary key generated always as identity;

-- create_discount_tiers_table
create table discount_tiers (
    "TierID" text not null constraint "discount_tiers_TierID_key" unique,
    "DiscountPercentage" smallint not null
);
-- seed_discount_tiers_table
\copy discount_tiers from 'db/seeds/tblDiscountTiers.csv' with (format csv, header match)

-- create_sales_reps_table
create table sales_reps (
    "SalesRepID" text not null constraint "sales_reps_SalesRepID_key" unique,
    "Currency" text not null,
    "Commission" smallint,
    "Tax" smallint not null,
    "AgentSplit" smallint not null
);
-- seed_sales_reps_table
\copy sales_reps from 'db/seeds/tblSalesReps.csv' with (format csv, header match)

-- create_customers_table
create table customers (
    "LineNumber" smallint unique not null,
    "CustomerID" text not null constraint "customers_CustomerID_key" unique,
    "CustomerName" text not null,
    "PriceGroupID" text not null,
    "ShipToTelephone" text not null,
    "ShipToContact" text,
    "Currency" text not null,
    "ShipToName" text not null,
    "ShipToAddress" text not null,
    "ShipToCity" text not null,
    "ShipToProvinceState" text not null,
    "ShipToPostalCode" text not null,
    "BillToName" text not null,
    "BillToAddress" text not null,
    "BillToCity" text not null,
    "CreateDate" timestamptz,
    "BillToProvinceState" text not null,
    "BillToPostalCode" text not null,
    "BillToTelephone" text not null,
    "SalesTax" numeric,
    "PST" numeric not null,
    "EmailInvoicesTo" text,
    "EmailInvoicesCC" text,
    "EmailStatementsTo" text,
    "EmailStatementsCC" text,
    "DisplaysHalfInch" text,
    "DisplaysOneInch" text,
    "PaymentTerms" text not null,
    "DaysLate" smallint,
    "SalesRep" text references sales_reps ("SalesRepID") on delete restrict not null,
    "MoveInvoiceTo" text,
    "MoveStatementTo" text,
    "BillingGroupID" text not null,
    "TierID" text references discount_tiers ("TierID") on delete restrict,
    "CashDiscountPercent" smallint,
    "RebatePercent" smallint,
    "MarketingFundsPercent" smallint,
    "Remarks" text,
    "Hold" boolean not null,
    "UpdatedPrices" boolean not null,
    "AddToMap" boolean not null,
    "ShowOnReports" boolean not null,
    "AvailableToOrder" boolean not null,
    "CreatedWhen" timestamptz,
    "CreatedBy" text,
    "UpdatedWhen" timestamptz,
    "UpdatedBy" text
);
-- seed_customers_table
\copy customers from 'db/seeds/tblCustomers.csv' with (format csv, header match)

-- create_item_prices_table
create table item_prices (
    "PriceID" text unique not null,
    "PriceGroupID" text not null,
    "ModelID" text not null,
    "PriceBrokenCase" numeric,
    "PriceCase" numeric,
    "CreatedWhen" timestamptz,
    "CreatedBy" text,
    "UpdatedWhen" timestamptz,
    "UpdatedBy" text
);
-- seed_item_prices_table
\copy item_prices from 'db/seeds/tblPrices.csv' with (format csv, header match)

-- create_currencies_table
create table currencies (
  id smallint primary key generated always as identity,
  code text unique not null
);
-- seed_currencies_table
insert into currencies (code) values ('CAD'), ('USD');

-- replace "Currency" with currency_id
alter table customers
add column currency_id smallint references currencies on delete restrict;

update customers
set currency_id = currencies.id
from currencies
where customers."Currency" = currencies.code;

alter table customers
alter column currency_id set not null;

alter table customers
drop column "Currency";

-- create_payment_terms_templates_table
create table payment_terms_templates (
  id smallint primary key generated always as identity,
  name text unique not null
);
-- seed_payment_terms_templates_table
insert into payment_terms_templates (name)
select distinct "PaymentTerms"
from customers;

-- replace "PaymentTerms" with payment_terms_template_id
alter table customers
add column payment_terms_template_id smallint references payment_terms_templates on delete restrict;

update customers
set payment_terms_template_id = payment_terms_templates.id
from payment_terms_templates
where customers."PaymentTerms" = payment_terms_templates.name;

alter table customers
alter column payment_terms_template_id set not null;

alter table customers
drop column "PaymentTerms";

-- create_price_groups_table
create table price_groups (
  id smallint primary key generated always as identity,
  code text unique not null
);
-- seed_price_groups_table
insert into price_groups (code)
select distinct "PriceGroupID"
from item_prices;

-- replace "PriceGroupID" with price_group_id
alter table customers
add column price_group_id smallint references price_groups on delete restrict;

update customers
set price_group_id = price_groups.id
from price_groups
where customers."PriceGroupID" = price_groups.code;

alter table customers
alter column price_group_id set not null;

alter table customers
drop column "PriceGroupID";

-- normalize_discount_tiers_table
alter table discount_tiers
add column id smallint primary key generated always as identity;

alter table discount_tiers
rename column "TierID" to name;

alter table discount_tiers
rename constraint "discount_tiers_TierID_key" to discount_tiers_name_key;

alter table discount_tiers
rename column "DiscountPercentage" to discount_rate;

alter table discount_tiers
alter column discount_rate type numeric using (discount_rate::numeric / 100);

-- replace "TierID" with discount_tier_id
alter table customers
add column discount_tier_id smallint references discount_tiers on delete restrict;

update customers
set discount_tier_id = discount_tiers.id
from discount_tiers
where customers."TierID" = discount_tiers.name;

alter table customers
drop column "TierID";

-- set discount_tier_id to not null
with basic_tier as (
  insert into discount_tiers (name, discount_rate)
  values ('Basic', 0)
  returning id
)
update customers
set discount_tier_id = basic_tier.id
from basic_tier
where customers.discount_tier_id is null;

alter table customers
alter column discount_tier_id set not null;

-- normalize_sales_reps_table
alter table sales_reps
add column id smallint primary key generated always as identity;

alter table sales_reps
rename column "SalesRepID" to name;

alter table sales_reps
rename constraint "sales_reps_SalesRepID_key" to sales_reps_name_key;

alter table sales_reps
add column currency_id smallint references currencies on delete restrict;

update sales_reps
set currency_id = currencies.id
from currencies
where sales_reps."Currency" = currencies.code;

alter table sales_reps
alter column currency_id set not null;

alter table sales_reps
drop column "Currency";

alter table sales_reps
rename column "Tax" to tax_rate;

alter table sales_reps
alter column tax_rate type numeric using (tax_rate::numeric / 100);

alter table sales_reps
rename column "AgentSplit" to agent_split;

alter table sales_reps
alter column agent_split type numeric using (agent_split::numeric / 100);

-- replace "SalesRep" with sales_rep_id
alter table customers
add column sales_rep_id smallint references sales_reps on delete restrict;

update customers
set sales_rep_id = sales_reps.id
from sales_reps
where customers."SalesRep" = sales_reps.name;

alter table customers
alter column sales_rep_id set not null;

alter table customers
drop column "SalesRep";

-- normalize_customers_table
alter table customers
add column id integer primary key generated always as identity;

alter table customers
rename column "CustomerID" to code;
alter table customers
rename constraint "customers_CustomerID_key" to customers_code_key;

alter table customers
rename column "CustomerName" to name;

alter table customers
rename column "SalesTax" to sales_tax_rate;

alter table customers
rename column "CashDiscountPercent" to cash_discount_rate;
alter table customers
alter column cash_discount_rate type numeric using (cash_discount_rate::numeric / 100);

alter table customers
rename column "RebatePercent" to rebate_rate;
alter table customers
alter column rebate_rate type numeric using (rebate_rate::numeric / 100);

alter table customers
rename column "Hold" to hold; 

alter table customers
rename column "UpdatedPrices" to updated_prices; 

alter table customers
rename column "AddToMap" to add_to_map; 

alter table customers
rename column "ShowOnReports" to show_on_reports; 

alter table customers
rename column "AvailableToOrder" to available_to_order; 

alter table customers
rename column "Remarks" to remarks;

-- create_transport_types_table
create table transport_types (
    "TransportID" smallint unique not null,
    "TransportName" text not null
);
-- seed_transport_types_table
\copy transport_types from 'db/seeds/tblTransport.csv' with (format csv, header match)
-- normalize_tranport_types_table
alter table transport_types
rename column "TransportName" to name;
alter table transport_types
add column id smallint primary key generated always as identity;

-- create_warehoues_table
create table warehouses (
    "WarehouseID" text not null,
    "Type" text not null,
    "Alias" text not null,
    "Address_Line_1" text not null,
    "Address_Line_2" text not null,
    "Address_Line_3" text
);
-- seed_warehouses_table
\copy warehouses from 'db/seeds/tblWarehouses.csv' with (format csv, header match)

-- create_warehoue_types_table
create table warehouse_types (
    id smallint primary key generated always as identity,
    name text not null
);
-- seed_warehouse_types_table
insert into warehouse_types (name)
select distinct "Type"
from warehouses;

-- replace "Type" with type_id
alter table warehouses
add column type_id smallint references warehouse_types on delete restrict;

update warehouses
set type_id = warehouse_types.id
from warehouse_types
where warehouses."Type" = warehouse_types.name;

alter table warehouses
alter column type_id set not null;

alter table warehouses
drop column "Type";

-- normalize_warehouses_table
alter table warehouses
rename column "WarehouseID" to code;

alter table warehouses
rename column "Alias" to name;

alter table warehouses
add column id smallint primary key generated always as identity,
add unique (code);

-- create_item_types_table
create table item_types (
    "TypeID" text unique not null,
    "TypeDescription" text
);
-- seed_item_types_table
\copy item_types from 'db/seeds/tblProductTypes.csv' with (format csv, header match)

-- create_items_table
create table items (
    "ModelID" text not null,
    "UPCCode" text,
    "Description" text,
    "SpecSheet" text,
    "WeightLBS" numeric,
    "WeightKG" numeric,
    "SortOrder" text not null,
    "RestockVAN" smallint,
    "RestockTOR" smallint,
    "RestockNAP" smallint,
    "RestockPHI" smallint,
    "RestockSEA" smallint,
    "TypeID" text references item_types ("TypeID") on delete restrict not null,
    "Royalty" boolean not null,
    "CreatedBy" text,
    "CreatedWhen" timestamptz,
    "UpdatedBy" text,
    "UpdatedWhen" timestamptz
);
-- seed_item_types_table
\copy items from 'db/seeds/tblProducts.csv' with (format csv, header match)

-- normalize_item_types_table
alter table item_types
add column id smallint primary key generated always as identity;

alter table item_types
rename "TypeID" to name;

alter table item_types
rename constraint "item_types_TypeID_key" to item_types_name_key;

alter table item_types
rename "TypeDescription" to description;

-- replace "TypeID" with type_id
alter table items
add column type_id smallint references item_types on delete restrict;

update items
set type_id = item_types.id
from item_types
where items."TypeID" = item_types.name;

alter table items
drop column "TypeID";

-- normalize_items_table
alter table items
add column id integer primary key generated always as identity;

alter table items
rename "ModelID" to name;
