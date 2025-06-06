import formal/form.{type Form}
import gleam/dict
import gleam/int
import gleam/json
import gleam/list
import gleam/option
import gleam/result
import gleam/set
import gleam/string
import lustre.{type App}
import lustre/attribute
import lustre/component
import lustre/effect.{type Effect}
import lustre/element.{type Element}
import lustre/element/html
import lustre/element/keyed
import lustre/event
import pog
import rada/date
import sql

// MAIN ------------------------------------------------------------------------

pub fn component() -> App(pog.Connection, Model, Msg) {
  lustre.component(init, update, view, [component.open_shadow_root(True)])
}

// MODEL -----------------------------------------------------------------------

pub type Model {
  Model(
    db: pog.Connection,
    lines: dict.Dict(String, List(Int)),
    fields: List(Field),
  )
}

pub type MultiSingleField {
  MultiSingleField(
    type_: String,
    name: String,
    required: Bool,
    values: List(Result(String, String)),
  )
}

pub type Field {
  SingleField(
    type_: String,
    name: String,
    required: Bool,
    value: option.Option(Result(String, String)),
  )
  MultiField(
    name: String,
    fields: List(MultiSingleField),
    error: option.Option(String),
  )
}

fn init(db) -> #(Model, Effect(Msg)) {
  #(
    Model(db:, lines: dict.new(), fields: [
      SingleField(
        type_: "date",
        name: "date",
        required: True,
        value: option.None,
      ),
      SingleField(
        type_: "text",
        name: "add",
        required: False,
        value: option.None,
      ),
      SingleField(
        type_: "number",
        name: "customer_id",
        required: True,
        value: option.None,
      ),
      MultiField(name: "items", error: option.None, fields: [
        MultiSingleField(
          type_: "number",
          name: "item_id",
          required: True,
          values: [],
        ),
        MultiSingleField(
          type_: "number",
          name: "unit_price",
          required: True,
          values: [],
        ),
      ]),
    ]),
    effect.none(),
  )
}

// fn form_date(str: String) -> Result(pog.Date, String) {
//   use d <- result.try(date.from_iso_string(str))
//   Ok(pog.Date(year: date.year(d), month: date.month_number(d), day: date.day(d)))
// }
//
// type ItemField(t) {
//   ItemField(key: String, value_type: fn(String) -> Result(t, String))
// }

// fn item_field_to_key(item_field: ItemField) {
//   case item_field {
//     ItemId -> "item_id"
//     Quantity -> "quantity"
//     UnitPrice -> "unit_price"
//     CommissionRate -> "commission_rate"
//     DiscountRate -> "discount_rate"
//   }
// }

fn decode_login_data(
  values: List(#(String, String)),
  db: pog.Connection,
  fields: List(Field),
) -> Result(Nil, List(Field)) {
  let values_dict =
    list.fold_right(values, dict.new(), fn(acc, pair) {
      dict.upsert(acc, pair.0, fn(previous) {
        [pair.1, ..option.unwrap(previous, [])]
      })
    })

  fields
  |> list.map(fn(field) {
    case field {
      SingleField(..) -> {
        let value = dict.get(values_dict, field.name) |> result.unwrap([])
        case value {
          [value] -> SingleField(..field, value: option.Some(Ok(value)))
          [] -> SingleField(..field, value: option.Some(Error("Not found")))
          _ -> SingleField(..field, value: option.Some(Error("Found many")))
        }
      }
      MultiField(..) -> {
        let fields =
          field.fields
          |> list.map(fn(field) {
            MultiSingleField(
              ..field,
              values: values_dict
                |> dict.get(field.name)
                |> result.unwrap([])
                |> list.map(fn(value) { Ok(value) }),
            )
          })

        let lengths =
          fields
          |> list.map(fn(field) { list.length(field.values) })
          |> list.try_fold(option.None, fn(acc, length) {
            case acc {
              option.None -> Ok(option.Some(length))
              option.Some(prev_lenghts) ->
                case prev_lenghts == length {
                  True -> Ok(option.Some(length))
                  False -> Error(Nil)
                }
            }
          })
        let error = case lengths {
          Ok(_) -> option.None
          Error(Nil) -> option.Some("Missing values")
        }

        MultiField(..field, fields:, error:)
      }
    }
  })

  fields
  |> list.map(fn(field) {
    case field {
      SingleField(..) -> {
        #(field.name, json.string(field.value))
      }
      MultiField(..) -> {
        #(
          field.name,
          field.fields
            |> list.map(fn(field) {
              field.values
              |> list.map(fn(value) { #(field.name, json.string(value)) })
            })
            |> list.transpose()
            |> json.array(json.object),
        )
      }
    }
  })
  |> json.object()

  Ok(Nil)
}

// UPDATE ----------------------------------------------------------------------

pub opaque type Msg {
  UserClickedSubmit(List(#(String, String)))
  UserClickedAddItem(String)
  UserClickedRemoveItem(String, Int)
}

fn update(model: Model, msg: Msg) -> #(Model, Effect(Msg)) {
  case msg {
    UserClickedSubmit(data) -> {
      case decode_login_data(data, model.db, model.fields) {
        Ok(Nil) -> #(model, effect.none())
        Error(fields) -> #(Model(..model, fields:), effect.none())
      }
    }
    UserClickedAddItem(name) -> #(
      Model(
        ..model,
        lines: model.lines
          |> dict.upsert(name, fn(lines) {
            let lines = option.unwrap(lines, [])

            lines
            |> list.append([
              lines
              |> list.last()
              |> result.map(fn(item) { item + 1 })
              |> result.unwrap(0),
            ])
          }),
      ),
      effect.none(),
    )
    UserClickedRemoveItem(name, item) -> #(
      Model(
        ..model,
        lines: model.lines
          |> dict.upsert(name, fn(lines) {
            lines
            |> option.unwrap([])
            |> list.filter(fn(i) { i != item })
          }),
      ),
      effect.none(),
    )
  }
}

// VIEW ------------------------------------------------------------------------

fn view_multifield(
  name name: String,
  fields fields: List(MultiSingleField),
  lines lines: dict.Dict(String, List(Int)),
) {
  element.fragment([
    keyed.fragment(
      lines
      |> dict.get(name)
      |> result.unwrap([])
      |> list.map(fn(line) {
        #(
          int.to_string(line),
          html.div([], [
            element.fragment(
              fields
              |> list.map(fn(field) {
                let MultiSingleField(type_:, name:, required:, ..) = field
                view_input(type_:, name:, required:)
              }),
            ),
            html.button(
              [
                attribute.type_("button"),
                event.on_click(UserClickedRemoveItem(name, line)),
              ],
              [html.text("Remove item")],
            ),
          ]),
        )
      }),
    ),
    html.button(
      [attribute.type_("button"), event.on_click(UserClickedAddItem(name))],
      [html.text("Add item")],
    ),
  ])
}

fn view(model: Model) -> Element(Msg) {
  html.form([event.on_submit(UserClickedSubmit)], [
    element.fragment(
      model.fields
      |> list.map(fn(field) {
        case field {
          SingleField(type_:, name:, required:, ..) ->
            view_input(type_:, name:, required:)
          MultiField(name:, fields:, ..) ->
            view_multifield(name:, fields:, lines: model.lines)
        }
      }),
    ),
    html.button([attribute.type_("submit")], [html.text("Save")]),
  ])
}

fn view_input(
  type_ type_: String,
  name name: String,
  required required: Bool,
) -> Element(msg) {
  html.div([], [
    html.label([attribute.for(name)], [html.text(name), html.text(": ")]),
    html.input([
      attribute.type_(type_),
      attribute.id(name),
      attribute.name(name),
      attribute.value("0"),
      attribute.required(required),
    ]),
  ])
}
