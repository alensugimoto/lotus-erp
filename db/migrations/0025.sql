create table sales_entries (
    id integer primary key generated always as identity,
    date timestamptz not null,
    add text not null,
    remarks text,
    customer_remarks text,
    customer_id customers.id%type references customers(id) on delete restrict not null,
    sales_rep_id sales_reps.id%type references sales_reps(id) on delete restrict not null,
    inserted_by users.id%type references users(id) on delete restrict not null,
    inserted_at timestamptz not null,
    updated_by users.id%type references users(id) on delete restrict,
    updated_at timestamptz);
create table sales_gimis (
    id sales_entries.id%type primary key references sales_entries(id) on delete restrict,
    buyer_name text not null,
    customer_name text not null,
    ship_via text not null,
    freight_charge numeric not null,
    warehouse_id warehouses.id%type references warehouses(id) on delete restrict not null);
create table sales_gimi_items (
    quantity integer not null,
    unit_price numeric not null,
    discount_rate numeric not null,
    commission_rate numeric not null,
    item_id items.id%type references items(id) on delete restrict not null,
    sales_gimi_id sales_gimis.id%type references sales_gimis(id) on delete cascade not null,
    unique (item_id, sales_gimi_id));
-- quotes
create table quote_statuses (
    id smallint primary key generated always as identity,
    code text unique not null,
    label text not null);
insert into quote_statuses (code, label) values
    -- ('ordered', 'Ordered'), order created
    -- ('expired', 'Expired'), expired
    ('draft', 'Draft'),
    ('open', 'Open'),
    ('cancelled', 'Cancelled');
create table quotes (
    id sales_gimis.id%type primary key references sales_gimis(id) on delete restrict,
    project_name text not null,
    status_id quote_statuses.id%type references quote_statuses(id) on delete restrict not null);
create table ordered_quotes (
    quote_id quotes.id%type references quotes(id) on delete cascade not null,
    order_id orders.id%type references orders(id) on delete restrict not null,
    unique (quote_id, order_id));
-- orders/invoices
create table order_statuses (
    id smallint primary key generated always as identity,
    code text unique not null,
    label text not null);
insert into order_statuses (code, label) values
    ('draft', 'Draft'),
    ('on_hold', 'On Hold'),
    -- ('on_backorder', 'On Backorder'), out of stock
    ('submitted', 'Submitted'),
    -- ('completed', 'Completed'), fully paid and (no-packing or delivered)
    ('cancelled', 'Cancelled');
create table orders (
    id sales_gimis.id%type primary key references sales_gimis(id) on delete restrict,
    customer_po text not null,
    is_urgent boolean not null,
    transport_type_id transport_types.id%type references transport_types(id) on delete restrict not null,
    status_id order_statuses.id%type references order_statuses(id) on delete restrict not null);
create table dropship_orders (
    id orders.id%type primary key references orders(id) on delete cascade,
    dropship_address_id physical_addresses.id%type references physical_addresses(id) on delete restrict not null);
create table invoiced_orders (
    id orders.id%type primary key references orders(id) on delete cascade,
    amount_paid numeric not null);
create table for_packing_orders (
    id orders.id%type primary key references orders(id) on delete cascade,
    email_for_tracking text not null);
create table in_transit_orders (
    id for_packing_orders.id%type primary key references for_packing_orders(id) on delete cascade,
    tracking_number text not null,
    initials text not null,
    is_delivered boalean not null);
-- returns/credit notes
create table return_statuses (
    id smallint primary key generated always as identity,
    code text unique not null,
    label text not null);
insert into return_statuses (code, label) values
    ('draft', 'Draft'),
    ('not_received', 'Not Received'),
    ('received', 'Received'),
    ('completed', 'Completed'), -- creditted
    ('cancelled', 'Cancelled');
create table returns (
    id sales_gimis.id%type primary key references sales_gimis(id) on delete restrict,
    customer_po text not null,
    status_id return_statuses.id%type references return_statuses(id) on delete restrict not null);
create table deduction_returns (
    id returns.id%type primary key references returns(id) on delete cascade,
    deduction_id deductions.id%type references deductions(id) on delete restrict not null);
-- deductions
create table deduction_statuses (
    id smallint primary key generated always as identity,
    code text unique not null,
    label text not null);
insert into deduction_statuses (code, label) values
    ('draft', 'Draft'),
    ('pending', 'Pending'),
    ('accepted', 'Accepted'), -- all returns created (covers the deduction amount)
    ('rejected', 'Rejected');
create table deductions (
    id sales_entries.id%type primary key references sales_entries(id) on delete restrict,
    check_date timestamptz not null,
    check_number text not null,
    total_deduction numeric not null,
    status_id deduction_statuses.id%type references deduction_statuses(id) on delete restrict not null);
