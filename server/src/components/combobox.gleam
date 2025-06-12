import gleam/list
import gleam/pair
import gleam/result
import lustre.{type App}
import lustre/attribute
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

// MODEL -----------------------------------------------------------------------

pub type Model {
  Model(
    db: pog.Connection,
    query: String,
    customers: List(sql.ListCustomersRow),
  )
}

fn init(db) -> #(Model, Effect(Msg)) {
  Model(query: "", db:, customers: [])
  |> pair.new(effect.none())
}

// UPDATE ----------------------------------------------------------------------

pub opaque type Msg {
  UserUpdatedQuery(String)
}

fn update(model: Model, msg: Msg) -> #(Model, Effect(Msg)) {
  case msg {
    UserUpdatedQuery(query) -> {
      let Model(db:, ..) = model

      db
      |> sql.list_customers(query)
      |> result.map(fn(rows) { rows.rows })
      |> result.replace_error([])
      |> result.unwrap_both
      |> Model(db:, query:)
      |> pair.new(effect.none())
    }
  }
}

// VIEW ------------------------------------------------------------------------

fn view(model: Model) -> Element(Msg) {
  let Model(query:, customers:, ..) = model

  html.div([], [
    html.input([
      attribute.name("query"),
      attribute.type_("text"),
      event.on_input(UserUpdatedQuery),
      attribute.value(query),
    ]),
    html.div(
      [],
      customers
        |> list.map(fn(customer) { html.div([], [html.text(customer.name)]) }),
    ),
  ])
}
