create table sales_entries (
    id integer primary key generated always as identity,
    date date not null,
    add text not null,
    remarks text not null,
    customer_remarks text not null,
    customer_id integer references customers on delete restrict not null,
    sales_rep_id smallint references sales_reps on delete restrict not null,
    inserted_by smallint references users on delete restrict not null,
    inserted_at timestamptz not null default now());
create table sales_gimis (
    id integer primary key references sales_entries on delete restrict,
    buyer_name text not null,
    customer_name text not null,
    ship_via text not null,
    freight_charge numeric not null,
    warehouse_id smallint references warehouses on delete restrict not null);
create table sales_gimi_items (
    quantity integer not null,
    unit_price numeric not null,
    discount_rate numeric not null,
    commission_rate numeric not null,
    item_id integer references items on delete restrict not null,
    sales_gimi_id integer references sales_gimis on delete cascade not null,
    unique (item_id, sales_gimi_id));
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
    id integer primary key references sales_gimis on delete restrict,
    customer_po text not null,
    is_urgent boolean not null,
    transport_type_id smallint references transport_types on delete restrict not null,
    status_id smallint references order_statuses on delete restrict not null);
create table dropship_orders (
    id integer primary key references orders on delete cascade,
    dropship_address_id integer references physical_addresses on delete restrict not null);
create table invoiced_orders (
    id integer primary key references orders on delete cascade,
    amount_paid numeric not null);
create table for_packing_orders (
    id integer primary key references orders on delete cascade,
    email_for_tracking text not null);
create table in_transit_orders (
    id integer primary key references for_packing_orders on delete cascade,
    tracking_number text not null,
    initials text not null,
    is_delivered boolean not null);
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
    id integer primary key references sales_entries on delete restrict,
    check_date timestamptz not null,
    check_number text not null,
    total_deduction numeric not null,
    status_id smallint references deduction_statuses on delete restrict not null);
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
    id integer primary key references sales_gimis on delete restrict,
    customer_po text not null,
    status_id smallint references return_statuses on delete restrict not null);
create table deduction_returns (
    id integer primary key references returns on delete cascade,
    deduction_id integer references deductions on delete restrict not null);
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
    id integer primary key references sales_gimis on delete restrict,
    project_name text not null,
    status_id smallint references quote_statuses on delete restrict not null);
create table ordered_quotes (
    quote_id integer references quotes on delete cascade not null,
    order_id integer references orders on delete restrict not null,
    unique (quote_id, order_id));
