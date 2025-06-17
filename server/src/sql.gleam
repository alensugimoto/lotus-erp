import gleam/dynamic/decode
import pog

/// A row you get from running the `list_customers` query
/// defined in `./src/sql/list_customers.sql`.
///
/// > 🐿️ This type definition was generated automatically using v3.0.4 of the
/// > [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub type ListCustomersRow {
  ListCustomersRow(id: Int, code: String, name: String)
}

/// Runs the `list_customers` query
/// defined in `./src/sql/list_customers.sql`.
///
/// > 🐿️ This function was generated automatically using v3.0.4 of
/// > the [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub fn list_customers(db, arg_1) {
  let decoder = {
    use id <- decode.field(0, decode.int)
    use code <- decode.field(1, decode.string)
    use name <- decode.field(2, decode.string)
    decode.success(ListCustomersRow(id:, code:, name:))
  }

  "select
    id,
    code,
    name
from
    customers
where
    $1 = '' or
    code ilike '%' || $1 || '%' or
    name ilike '%' || $1 || '%'
limit
    10;
"
  |> pog.query
  |> pog.parameter(pog.text(arg_1))
  |> pog.returning(decoder)
  |> pog.execute(db)
}

/// A row you get from running the `insert_quote` query
/// defined in `./src/sql/insert_quote.sql`.
///
/// > 🐿️ This type definition was generated automatically using v3.0.4 of the
/// > [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub type InsertQuoteRow {
  InsertQuoteRow(id: Int)
}

/// TODO: $3 and $4 should be nullable. Wait for https://github.com/giacomocavalieri/squirrel/discussions/23
///
/// > 🐿️ This function was generated automatically using v3.0.4 of
/// > the [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub fn insert_quote(
  db,
  arg_1,
  arg_2,
  arg_3,
  arg_4,
  arg_5,
  arg_6,
  arg_7,
  arg_8,
  arg_9,
  arg_10,
  arg_11,
  arg_12,
  arg_13,
  arg_14,
  arg_15,
  arg_16,
  arg_17,
  arg_18,
) {
  let decoder =
  {
    use id <- decode.field(0, decode.int)
    decode.success(InsertQuoteRow(id:))
  }

  "-- TODO: $3 and $4 should be nullable. Wait for https://github.com/giacomocavalieri/squirrel/discussions/23
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
"
  |> pog.query
  |> pog.parameter(pog.date(arg_1))
  |> pog.parameter(pog.text(arg_2))
  |> pog.parameter(pog.text(arg_3))
  |> pog.parameter(pog.text(arg_4))
  |> pog.parameter(pog.int(arg_5))
  |> pog.parameter(pog.int(arg_6))
  |> pog.parameter(pog.int(arg_7))
  |> pog.parameter(pog.text(arg_8))
  |> pog.parameter(pog.text(arg_9))
  |> pog.parameter(pog.text(arg_10))
  |> pog.parameter(pog.float(arg_11))
  |> pog.parameter(pog.int(arg_12))
  |> pog.parameter(pog.array(fn(value) { pog.int(value) }, arg_13))
  |> pog.parameter(pog.array(fn(value) { pog.int(value) }, arg_14))
  |> pog.parameter(pog.array(fn(value) { pog.float(value) }, arg_15))
  |> pog.parameter(pog.array(fn(value) { pog.float(value) }, arg_16))
  |> pog.parameter(pog.array(fn(value) { pog.float(value) }, arg_17))
  |> pog.parameter(pog.text(arg_18))
  |> pog.returning(decoder)
  |> pog.execute(db)
}

/// A row you get from running the `get_customer` query
/// defined in `./src/sql/get_customer.sql`.
///
/// > 🐿️ This type definition was generated automatically using v3.0.4 of the
/// > [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub type GetCustomerRow {
  GetCustomerRow(id: Int, code: String)
}

/// Runs the `get_customer` query
/// defined in `./src/sql/get_customer.sql`.
///
/// > 🐿️ This function was generated automatically using v3.0.4 of
/// > the [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub fn get_customer(db, arg_1) {
  let decoder = {
    use id <- decode.field(0, decode.int)
    use code <- decode.field(1, decode.string)
    decode.success(GetCustomerRow(id:, code:))
  }

  "select id, code from customers where id = $1;
"
  |> pog.query
  |> pog.parameter(pog.int(arg_1))
  |> pog.returning(decoder)
  |> pog.execute(db)
}
