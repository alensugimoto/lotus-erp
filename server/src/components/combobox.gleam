import client/customer_combobox
import client/ui/combobox
import gleam/int
import gleam/list
import gleam/option
import gleam/pair
import gleam/result
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
  Model(
    db: pog.Connection,
    customers: List(sql.ListCustomersRow),
    selection: option.Option(sql.GetCustomerRow),
  )
}

fn init(db) -> #(Model, Effect(Msg)) {
  Model(db:, customers: [], selection: option.None)
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
      let Model(db:, ..) = model

      let result = {
        use value <- result.try(
          value
          |> int.parse,
        )
        use rows <- result.try(
          db
          |> sql.get_customer(value)
          |> result.replace_error(Nil),
        )
        case rows.rows {
          [row] -> Ok(row)
          _ -> Error(Nil)
        }
      }

      case result {
        Ok(row) -> {
          let model = Model(..model, selection: row |> option.Some)
          let effect = customer_combobox.emit_change(row.id)
          #(model, effect)
        }
        Error(Nil) -> #(model, effect.none())
      }
    }

    UserUpdatedQuery(query) -> {
      let Model(db:, ..) = model

      db
      |> sql.list_customers(query)
      |> result.map(fn(rows) { rows.rows })
      |> result.replace_error([])
      |> result.unwrap_both
      |> fn(customers) { Model(..model, customers:) }
      |> pair.new(effect.none())
    }
  }
}

// VIEW ------------------------------------------------------------------------

fn view(model: Model) -> Element(Msg) {
  let Model(customers:, selection:, ..) = model

  let #(selected, customers) =
    customers
    |> list.map_fold(False, fn(acc, customer) {
      let selected = case selection {
        option.None -> False
        option.Some(selection) -> customer.id == selection.id
      }

      #(
        acc || selected,
        combobox.option(
          value: customer.id
            |> int.to_string,
          label: customer.code,
          selected:,
          content: option.Some([
            html.h5([], [html.text(customer.name)]),
            html.p([], [html.text(customer.code)]),
          ]),
        ),
      )
    })

  combobox.element(
    [combobox.on_query(UserUpdatedQuery), combobox.on_change(UserUpdatedValue)],
    case selected {
      True -> customers
      False -> [
        case selection {
          option.Some(selection) ->
            combobox.option(
              value: selection.id
                |> int.to_string,
              label: selection.code,
              selected: True,
              content: option.None,
            )
          option.None ->
            combobox.option(
              value: "",
              label: "Please select a customer",
              selected: True,
              content: option.None,
            )
        },
        ..customers
      ]
    },
  )
}
