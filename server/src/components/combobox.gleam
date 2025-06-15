import client/ui/combobox
import gleam/dynamic/decode
import gleam/int
import gleam/json
import gleam/list
import gleam/pair
import gleam/result
import lustre.{type App}
import lustre/attribute.{type Attribute}
import lustre/component
import lustre/effect.{type Effect}
import lustre/element.{type Element}
import lustre/element/html
import lustre/event
import pog
import sql

// MAIN ------------------------------------------------------------------------

pub fn component() -> App(pog.Connection, Model, Msg) {
  lustre.component(init, update, view, [component.open_shadow_root(True)])
}

const detail = "detail"

pub fn on_change(handler: fn(String) -> msg) -> Attribute(msg) {
  let value = [detail, "value"]
  event.on("change", {
    decode.at(value, decode.string)
    |> decode.map(handler)
  })
}

// MODEL -----------------------------------------------------------------------

pub type Model {
  Model(db: pog.Connection, customers: List(sql.ListCustomersRow))
}

fn init(db) -> #(Model, Effect(Msg)) {
  Model(db:, customers: [])
  |> pair.new(effect.none())
}

// UPDATE ----------------------------------------------------------------------

pub opaque type Msg {
  UserUpdatedValue(String)
  UserUpdatedQuery(String)
}

fn update(model: Model, msg: Msg) -> #(Model, Effect(Msg)) {
  case msg {
    UserUpdatedValue(value) -> {
      let effect =
        event.emit("change", json.object([#("value", json.string(value))]))

      #(model, effect)
    }

    UserUpdatedQuery(query) -> {
      let Model(db:, ..) = model

      db
      |> sql.list_customers(query)
      |> result.map(fn(rows) { rows.rows })
      |> result.replace_error([])
      |> result.unwrap_both
      |> Model(db:)
      |> pair.new(effect.none())
    }
  }
}

// VIEW ------------------------------------------------------------------------

fn view(model: Model) -> Element(Msg) {
  let Model(customers:, ..) = model

  combobox.element(
    [combobox.on_query(UserUpdatedQuery), combobox.on_change(UserUpdatedValue)],
    customers
      |> list.map(fn(customer) {
        #(
          customer.id
            |> int.to_string,
          customer.code,
          [
            html.div([], [html.text(customer.name)]),
            html.div([], [html.text(int.to_string(customer.id))]),
          ],
        )
      })
      |> list.prepend(#("", [html.text("Please select a customer...")])),
  )
}
