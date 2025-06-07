// IMPORTS ---------------------------------------------------------------------

import gleam/dict
import gleam/dynamic
import gleam/dynamic/decode
import gleam/int
import gleam/json
import gleam/list
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

pub fn on_change(handler: fn(dynamic.Dynamic) -> msg) -> Attribute(msg) {
  let detail = "detail"

  event.on(event_name, {
    decode.at([detail], decode.dynamic)
    |> decode.map(handler)
  })
  |> server_component.include([detail])
}

fn fields_to_json(
  fields: List(#(String, #(Result(json.Json, String), Field))),
) -> Result(json.Json, Nil) {
  fields
  |> list.try_map(field_to_json)
  |> result.map(json.object)
}

fn field_to_json(
  field: #(String, #(Result(json.Json, String), Field)),
) -> Result(#(String, json.Json), Nil) {
  let #(name, #(json, _field)) = field

  json
  |> result.map(pair.new(name, _))
  |> result.replace_error(Nil)
}

fn field_update(field: Field, value: String) -> Result(json.Json, String) {
  case field.required && string.is_empty(value) {
    True -> Error("Required")
    False -> field.update(value)
  }
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
    json: option.Option(Result(json.Json, String)),
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
          json: option.None,
          update: fn(value) { value |> json.string |> Ok },
        ),
      )
      |> dict.insert(
        "customer_id",
        SingleField(
          type_: "text",
          required: True,
          value: "",
          json: option.None,
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
      let pairs =
        model.fields
        |> dict.map_values(fn(_name, field) {
          field.json
          |> option.lazy_unwrap(fn() { field_update(field, field.value) })
          |> pair.new(field)
        })

      let model =
        Model(
          fields: pairs
          |> dict.map_values(fn(_name, pair) {
            let #(json, field) = pair

            SingleField(
              ..field,
              json: json
                |> option.Some,
            )
          }),
        )

      let effect =
        pairs
        |> dict.to_list
        |> fields_to_json
        |> result.map(event.emit(event_name, _))
        |> result.unwrap(effect.none())

      #(model, effect)
    }
    UserUpdatedValue(name, value) -> {
      echo #(name, value)
      model.fields
      |> dict.get(name)
      |> result.map(fn(field) {
        Model(
          fields: model.fields
          |> dict.insert(
            name,
            SingleField(
              ..field,
              value:,
              json: value
                |> field_update(field, _)
                |> option.Some,
            ),
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
      |> option.map(fn(json) {
        json
        |> result.replace(element.none())
        |> result.map_error(fn(msg) { html.p([], [html.text(msg)]) })
        |> result.unwrap_both
      })
      |> option.lazy_unwrap(element.none),
  ])
}
