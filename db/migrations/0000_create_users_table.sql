-- TODO: "BillingGroupID"
-- TODO: wrap in transaction

-- create_users_table
create table users (
    "LogonID" text primary key,
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
