import client/formy
import gleam/list
import gleam/time/calendar
import lustre.{type App}
import lustre/component
import lustre/effect.{type Effect}
import lustre/element.{type Element}
import lustre/element/html
import pog
import sql

// MAIN ------------------------------------------------------------------------

pub fn component() -> App(pog.Connection, Model, Msg) {
  lustre.component(init, update, view, [component.open_shadow_root(True)])
}

// MODEL -----------------------------------------------------------------------

pub type Model {
  Model(db: pog.Connection)
}

fn init(db) -> #(Model, Effect(Msg)) {
  #(Model(db:), effect.none())
}

// UPDATE ----------------------------------------------------------------------

pub opaque type Msg {
  UserClickedSave(formy.Form)
}

fn update(model: Model, msg: Msg) -> #(Model, Effect(Msg)) {
  case msg {
    UserClickedSave(form) -> {
      let inserted_by = 1
      let formy.Form(
        date: calendar.Date(year:, month:, day:),
        add:,
        remarks:,
        customer_remarks:,
        customer_id:,
        sales_rep_id:,
        buyer_name:,
        customer_name:,
        ship_via:,
        freight_charge:,
        warehouse_id:,
        line_items:,
        project_name:,
      ) = form
      let month = month |> calendar.month_to_int
      let #(item_ids, quantities, unit_prices, commission_rates, discount_rates) =
        line_items
        |> list.map(fn(line_item) {
          let formy.LineItem(
            item_id:,
            quantity:,
            unit_price:,
            commission_rate:,
            discount_rate:,
          ) = line_item
          #(
            item_id.inner,
            quantity.inner,
            unit_price.inner,
            commission_rate.inner,
            discount_rate.inner,
          )
        })
        |> unzip5

      echo "hello"
      echo sql.insert_quote(
        model.db,
        pog.Date(year:, month:, day:),
        add,
        remarks,
        customer_remarks,
        customer_id.inner,
        sales_rep_id.inner,
        inserted_by,
        buyer_name.inner,
        customer_name.inner,
        ship_via.inner,
        freight_charge.inner,
        warehouse_id.inner,
        item_ids,
        quantities,
        unit_prices,
        commission_rates,
        discount_rates,
        project_name.inner,
      )
      #(model, effect.none())
    }
  }
}

pub type LineItemFields {
  LineItemFields(
    item_ids: List(formy.PositiveInt),
    quantities: List(formy.PositiveInt),
    unit_prices: List(formy.NonNegativeFloat),
    commission_rates: List(formy.NonNegativeFloat),
    discount_rates: List(formy.NonNegativeFloat),
  )
}

// TODO: use wrapper types and merge msg types and no labels

fn unzip5(
  input: List(#(a, b, c, d, e)),
) -> #(List(a), List(b), List(c), List(d), List(e)) {
  unzip5_loop(input, [], [], [], [], [])
}

fn unzip5_loop(
  input: List(#(a, b, c, d, e)),
  one: List(a),
  two: List(b),
  three: List(c),
  four: List(d),
  five: List(e),
) -> #(List(a), List(b), List(c), List(d), List(e)) {
  case input {
    [] -> #(
      list.reverse(one),
      list.reverse(two),
      list.reverse(three),
      list.reverse(four),
      list.reverse(five),
    )
    [#(first_one, first_two, first_three, first_four, first_five), ..rest] ->
      unzip5_loop(
        rest,
        [first_one, ..one],
        [first_two, ..two],
        [first_three, ..three],
        [first_four, ..four],
        [first_five, ..five],
      )
  }
}

// VIEW ------------------------------------------------------------------------

fn view(_model: Model) -> Element(Msg) {
  html.div([], [formy.element([formy.on_change(UserClickedSave)])])
}
