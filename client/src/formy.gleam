// IMPORTS ---------------------------------------------------------------------

import gleam/dict
import gleam/dynamic
import gleam/dynamic/decode
import gleam/int
import gleam/json
import gleam/list
import gleam/pair
import gleam/result
import lustre
import lustre/attribute.{type Attribute}
import lustre/effect
import lustre/element.{type Element}
import lustre/element/html
import lustre/event

// MAIN ------------------------------------------------------------------------

const component_name = "formy"

const event_name = "change"

//
pub fn register() -> Result(Nil, lustre.Error) {
  let component = lustre.component(init, update, view, [])
  lustre.register(component, component_name)
}

pub fn element(attributes: List(Attribute(msg))) -> Element(msg) {
  element.element(component_name, attributes, [])
}

pub fn on_change(handler: fn(dynamic.Dynamic) -> msg) -> Attribute(msg) {
  event.on(event_name, {
    decode.at(["detail"], decode.dynamic) |> decode.map(handler)
  })
}

fn model_to_json(model: Model) -> Result(json.Json, Nil) {
  model.fields
  |> dict.to_list()
  |> list.try_map(field_to_json)
  |> result.map(json.object)
}

fn field_to_json(field: #(String, Field)) -> Result(#(String, json.Json), Nil) {
  let #(name, field) = field

  field.json
  |> result.map(pair.new(name, _))
  |> result.replace_error(Nil)
}

// MODEL -----------------------------------------------------------------------

pub type Model {
  Model(fields: dict.Dict(String, Field))
}

pub type Field {
  SingleField(
    type_: String,
    required: Bool,
    value: String,
    json: Result(json.Json, String),
    update: fn(String) -> Result(json.Json, String),
  )
}

fn init(_) -> #(Model, effect.Effect(Msg)) {
  #(
    Model(
      fields: dict.new()
      |> dict.insert(
        "date",
        SingleField(
          type_: "date",
          required: True,
          value: "",
          json: json.null() |> Ok,
          update: fn(value) { value |> json.string |> Ok },
        ),
      )
      |> dict.insert(
        "customer_id",
        SingleField(
          type_: "number",
          required: True,
          value: "",
          json: json.null() |> Ok,
          update: fn(value) {
            value
            |> int.parse
            |> result.map(json.int)
            |> result.replace_error("Invalid ID")
          },
        ),
      ),
    ),
    effect.none(),
  )
}

// UPDATE ----------------------------------------------------------------------

pub type Msg {
  UserClickedSave
  UserUpdatedValue(String, String)
}

fn update(model: Model, msg: Msg) -> #(Model, effect.Effect(Msg)) {
  case msg {
    UserClickedSave -> {
      model
      |> model_to_json
      |> result.map(event.emit(event_name, _))
      |> result.unwrap(effect.none())
      |> pair.new(model, _)
    }
    UserUpdatedValue(name, value) -> {
      model.fields
      |> dict.get(name)
      |> result.map(fn(field) {
        Model(
          fields: model.fields
          |> dict.insert(
            name,
            SingleField(..field, value:, json: field.update(value)),
          ),
        )
      })
      |> result.unwrap(model)
      |> pair.new(effect.none())
    }
  }
}

// VIEW ------------------------------------------------------------------------

fn view(model: Model) -> Element(Msg) {
  html.div([], [
    element.fragment(
      model.fields
      |> dict.to_list()
      |> list.map(view_input),
    ),
    html.button([event.on_click(UserClickedSave)], [html.text("Save")]),
  ])
}

fn view_input(field: #(String, Field)) -> Element(Msg) {
  let #(name, SingleField(type_:, value:, required:, json:, ..)) = field

  html.div([], [
    html.label([attribute.for(name)], [html.text(name), html.text(": ")]),
    html.input([
      attribute.type_(type_),
      attribute.id(name),
      attribute.name(name),
      event.on_input(UserUpdatedValue(name, _)),
      attribute.value(value),
      attribute.required(required),
    ]),
    json
      |> result.replace(element.none())
      |> result.map_error(fn(msg) { html.p([], [html.text(msg)]) })
      |> result.unwrap_both,
  ])
}
