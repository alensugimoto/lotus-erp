create type quote_item_type as (
    item_id items.id%type,
    quantity integer,
    unit_price numeric,
    commission_rate numeric,
    discount_rate numeric
);

create or replace function insert_quote(
    date timestamptz,
    add text,
    customer_id customers.id%type,
    sales_rep_id sales_reps.id%type,
    inserted_by users.id%type,
    buyer_name text,
    customer_name text,
    ship_via text,
    freight_charge numeric,
    warehouse_id warehouses.id%type,
    project_name text,
    items quote_item_type[],
    remarks text default null,
    customer_remarks text default null
)
returns void as $$
begin
    with sales_entry as (
        insert into sales_entries (date, add, remarks, customer_remarks, customer_id, sales_rep_id, inserted_by)
        values (date, add, remarks, customer_remarks, customer_id, sales_rep_id, inserted_by)
        returning id
    ), sales_gimi as (
        insert into sales_gimis (id, buyer_name, customer_name, ship_via, freight_charge, warehouse_id)
        values (sales_entry.id, buyer_name, customer_name, ship_via, freight_charge, warehouse_id)
        returning id
    ), sales_gimi_items as (
        insert into sales_gimi_items (sales_gimi_id, item_id, quantity, unit_price, commission_rate, discount_rate)
        select sales_gimi.id, (i).item_id, (i).quantity, (i).unit_price, (i).commission_rate, (i).discount_rate
        from unnest(items) as i
    ), draft as (
        select id
        from quote_statuses
        where code = 'draft'
    )
    insert into quotes (id, status_id, project_name)
    values (sales_gimi.id, draft.id, project_name);
end;
$$ language plpgsql;

create or replace function update_quote(
    quote_id sales_entries.id%type,
    date timestamptz,
    add text,
    customer_id customers.id%type,
    sales_rep_id sales_reps.id%type,
    updated_by users.id%type,
    buyer_name text,
    customer_name text,
    ship_via text,
    freight_charge numeric,
    warehouse_id warehouses.id%type,
    project_name text,
    items quote_item_type[],
    remarks text default null,
    customer_remarks text default null
)
returns void as $$
begin
    -- Update sales_entries
    update sales_entries
    set 
        date = update_quote.date,
        add = update_quote.add,
        remarks = update_quote.remarks,
        customer_remarks = update_quote.customer_remarks,
        customer_id = update_quote.customer_id,
        sales_rep_id = update_quote.sales_rep_id,
        updated_by = update_quote.updated_by,
        updated_at = now()
    where id = quote_id;

    -- Update sales_gimis
    update sales_gimis
    set 
        buyer_name = update_quote.buyer_name,
        customer_name = update_quote.customer_name,
        ship_via = update_quote.ship_via,
        freight_charge = update_quote.freight_charge,
        warehouse_id = update_quote.warehouse_id
    where id = quote_id;

    -- Delete existing items and insert new ones
    delete from sales_gimi_items where sales_gimi_id = quote_id;

    insert into sales_gimi_items (sales_gimi_id, item_id, quantity, unit_price, commission_rate, discount_rate)
    select quote_id, (i).item_id, (i).quantity, (i).unit_price, (i).commission_rate, (i).discount_rate
    from unnest(items) as i;

    -- Update quotes
    update quotes
    set 
        project_name = update_quote.project_name
    where id = quote_id;
end;
$$ language plpgsql;
