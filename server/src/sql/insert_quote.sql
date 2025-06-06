-- TODO: $3 and $4 should be nullable. Wait for https://github.com/giacomocavalieri/squirrel/discussions/23
with sales_entry as (
    insert into sales_entries (date, add, remarks, customer_remarks, customer_id, sales_rep_id, inserted_by)
    values ($1, $2, $3, $4, $5, $6, $7)
    returning id
), sales_gimi as (
    insert into sales_gimis (id, buyer_name, customer_name, ship_via, freight_charge, warehouse_id)
    select sales_entry.id, $8, $9, $10, $11, $12
    from sales_entry
    returning id
), sales_gimi_items as (
    insert into sales_gimi_items (sales_gimi_id, item_id, quantity, unit_price, commission_rate, discount_rate)
    select
        sales_gimi.id,
        i.*
    from
        sales_gimi,
        unnest(
            $13::integer[],
            $14::integer[],
            $15::numeric[],
            $16::numeric[],
            $17::numeric[]
        ) as i(item_id, quantity, unit_price, commission_rate, discount_rate)
), draft as (
    select id
    from quote_statuses
    where code = 'draft'
)
insert into quotes (id, status_id, project_name)
select sales_gimi.id, draft.id, $18
from sales_gimi, draft
returning id;
