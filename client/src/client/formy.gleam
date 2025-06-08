// IMPORTS ---------------------------------------------------------------------

import gleam/dynamic/decode
import gleam/int
import gleam/json
import gleam/option
import gleam/pair
import gleam/result
import gleam/string
import lustre
import lustre/attribute.{type Attribute}
import lustre/component
import lustre/effect
import lustre/element.{type Element}
import lustre/element/html
import lustre/event
import lustre/server_component

// MAIN ------------------------------------------------------------------------

const component_name = "my-form"

const event_name = "change"

//
pub fn register() -> Result(Nil, lustre.Error) {
  let component =
    lustre.component(init, update, view, [component.open_shadow_root(True)])
  lustre.register(component, component_name)
}

pub fn element(attributes: List(Attribute(msg))) -> Element(msg) {
  element.element(component_name, attributes, [])
}

pub fn on_change(handler: fn(Form) -> msg) -> Attribute(msg) {
  let detail = "detail"

  event.on(event_name, {
    decode.at([detail], form_decoder())
    |> decode.map(handler)
  })
  |> server_component.include([detail])
}

// MODEL -----------------------------------------------------------------------

pub type Model {
  Model(date: Field(String), customer_id: Field(Int))
}

pub type Form {
  Form(date: String, customer_id: Int)
}

fn form_decoder() -> decode.Decoder(Form) {
  use date <- decode.field("date", decode.string)
  use customer_id <- decode.field("customer_id", decode.int)
  decode.success(Form(date:, customer_id:))
}

fn get_parsed_value(field: Field(a)) -> Result(a, String) {
  case field.parsed_value {
    option.None -> field.value |> field.parse
    option.Some(parsed_value) -> parsed_value
  }
}

fn update_values(model: Model) -> Model {
  let Model(date:, customer_id:) = model

  Model(
    date: SingleField(
      ..date,
      parsed_value: date
        |> get_parsed_value
        |> option.Some,
    ),
    customer_id: SingleField(
      ..customer_id,
      parsed_value: customer_id
        |> get_parsed_value
        |> option.Some,
    ),
  )
}

fn encode_model(model: Model) -> Result(json.Json, String) {
  let Model(date:, customer_id:) = model

  use parsed_date <- result.try(get_parsed_value(date))
  use parsed_customer_id <- result.try(get_parsed_value(customer_id))

  [
    #(date.name, json.string(parsed_date)),
    #(customer_id.name, json.int(parsed_customer_id)),
  ]
  |> json.object
  |> Ok
}

pub type Field(a) {
  SingleField(
    name: String,
    value: String,
    type_: String,
    required: Bool,
    on_input: fn(String) -> Msg,
    parsed_value: option.Option(Result(a, String)),
    parse: fn(String) -> Result(a, String),
  )
}

fn update_value(value: String, field: Field(a)) {
  SingleField(
    ..field,
    value:,
    parsed_value: value
      |> field.parse
      |> option.Some,
  )
}

fn init(_) -> #(Model, effect.Effect(Msg)) {
  #(
    Model(
      date: SingleField(
        name: "date",
        type_: "date",
        value: "",
        required: True,
        parsed_value: option.None,
        on_input: UserUpdatedDate,
        parse: fn(value) {
          case value |> string.is_empty {
            True -> Error("Required")
            False -> Ok(value)
          }
        },
      ),
      customer_id: SingleField(
        name: "customer_id",
        type_: "text",
        value: "",
        required: True,
        parsed_value: option.None,
        on_input: UserUpdatedCustomerId,
        parse: fn(value) {
          case value |> string.is_empty {
            True -> Error("Required")
            False ->
              value
              |> int.parse
              |> result.replace_error("Invalid ID")
          }
        },
      ),
    ),
    effect.none(),
  )
}

// UPDATE ----------------------------------------------------------------------

pub type Msg {
  UserClickedSave
  UserUpdatedDate(String)
  UserUpdatedCustomerId(String)
}

fn update(model: Model, msg: Msg) -> #(Model, effect.Effect(Msg)) {
  case msg {
    UserClickedSave -> {
      let model =
        model
        |> update_values

      let effect =
        model
        |> encode_model
        |> result.map(event.emit(event_name, _))
        |> result.lazy_unwrap(effect.none)

      #(model, effect)
    }

    UserUpdatedDate(value) -> {
      value
      |> update_value(model.date)
      |> fn(field) { Model(..model, date: field) }
      |> pair.new(effect.none())
    }

    UserUpdatedCustomerId(value) -> {
      value
      |> update_value(model.customer_id)
      |> fn(field) { Model(..model, customer_id: field) }
      |> pair.new(effect.none())
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
  let SingleField(
    name:,
    value:,
    type_:,
    parsed_value:,
    required:,
    on_input:,
    ..,
  ) = field

  html.div([], [
    html.label([attribute.for(name)], [html.text(name), html.text(": ")]),
    html.input([
      attribute.type_(type_),
      attribute.id(name),
      attribute.name(name),
      event.on_input(on_input),
      attribute.value(value),
      attribute.required(required),
    ]),
    parsed_value
      |> option.map(fn(parsed_value) {
        parsed_value
        |> result.map(fn(_) { element.none() })
        |> result.map_error(fn(msg) { html.p([], [html.text(msg)]) })
        |> result.unwrap_both
      })
      |> option.lazy_unwrap(element.none),
  ])
}
