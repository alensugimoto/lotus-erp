// IMPORTS ---------------------------------------------------------------------

import gleam/dynamic
import gleam/dynamic/decode
import gleam/function
import gleam/int
import gleam/json
import gleam/option
import lustre
import lustre/attribute.{type Attribute}
import lustre/element.{type Element}
import lustre/element/html
import lustre/event

// MAIN ------------------------------------------------------------------------

const component_name = "formy"

//
pub fn register() -> Result(Nil, lustre.Error) {
  let component = lustre.simple(init, update, view)
  lustre.register(component, component_name)
}

pub fn element() -> Element(msg) {
  element.element(component_name, [], [])
}

pub fn on_change(handler: fn(dynamic.Dynamic) -> msg) -> Attribute(msg) {
  event.on("change", {
    decode.at(["detail"], decode.dynamic) |> decode.map(handler)
  })
}

fn model_to_json(model: Model) -> json.Json {
  let Model(date:, customer_id:) = model
  json.object([field_to_json(date), field_to_json(customer_id)])
}

fn field_to_json(field: Field(a)) -> #(String, json.Json) {
  #(field.name, field.json(field.real))
}

// MODEL -----------------------------------------------------------------------

pub type Model {
  Model(date: Field(String), customer_id: Field(option.Option(Int)))
}

pub type Field(a) {
  SingleField(
    type_: String,
    name: String,
    required: Bool,
    msg: fn(String) -> Msg,
    real: a,
    error: String,
    value: fn(a) -> String,
    json: fn(a) -> json.Json,
  )
}

fn init(_) -> Model {
  Model(
    date: SingleField(
      type_: "date",
      name: "date",
      required: True,
      msg: UserUpdatedDate,
      real: "",
      error: "",
      value: function.identity,
      json: json.string,
    ),
    customer_id: SingleField(
      type_: "number",
      name: "customer_id",
      required: True,
      msg: UserUpdatedCustomerId,
      real: option.None,
      error: "",
      value: fn(real) {
        case real {
          option.None -> ""
          option.Some(real) -> int.to_string(real)
        }
      },
      json: fn(real) {
        case real {
          option.None -> json.null()
          option.Some(real) -> json.int(real)
        }
      },
    ),
  )
}

// UPDATE ----------------------------------------------------------------------

pub type Msg {
  UserClickedSave
  UserUpdatedDate(String)
  UserUpdatedCustomerId(String)
}

fn update(model: Model, msg: Msg) -> Model {
  case msg {
    UserClickedSave -> {
      event.emit("change", model_to_json(model))
      model
    }
    UserUpdatedDate(date) -> {
      Model(..model, date: SingleField(..model.date, real: date))
    }
    UserUpdatedCustomerId(customer_id) -> {
      let #(real, error) = case int.parse(customer_id) {
        Ok(i) -> #(option.Some(i), "")
        Error(Nil) -> #(option.None, "Invalid ID")
      }
      Model(
        ..model,
        customer_id: SingleField(..model.customer_id, real:, error:),
      )
    }
  }
}

// VIEW ------------------------------------------------------------------------

fn view(model: Model) -> Element(Msg) {
  let Model(date:, customer_id:) = model

  html.div([], [
    view_input(date),
    view_input(customer_id),
    html.button([event.on_click(UserClickedSave)], [html.text("Save")]),
  ])
}

fn view_input(field: Field(a)) -> Element(Msg) {
  let SingleField(name:, type_:, msg:, value:, real:, required:, error:, ..) =
    field

  html.div([], [
    html.label([attribute.for(name)], [html.text(name), html.text(": ")]),
    html.input([
      attribute.type_(type_),
      attribute.id(name),
      attribute.name(name),
      event.on_input(msg),
      attribute.value(value(real)),
      attribute.required(required),
    ]),
    case error {
      "" -> element.none()
      _ -> html.p([], [html.text(error)])
    },
  ])
}
