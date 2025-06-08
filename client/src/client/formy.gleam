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

pub fn on_change(handler: fn(Result(json.Json, Nil)) -> msg) -> Attribute(msg) {
  let detail = "detail"

  event.on(event_name, {
    decode.at([detail], decode.dict(decode.string, decode.dynamic))
    |> decode.map(fn(dyn) {
      let fields = get_fields()

      dyn
      |> dict.to_list
      |> list.try_map(fn(pair) {
        let #(name, value) = pair

        fields
        |> dict.get(name)
        |> result.then(fn(field) { field_type_decode(field.type_, value) })
        |> result.map(pair.new(name, _))
      })
      |> result.map(json.object)
      |> handler
    })
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
    False -> field_type_update(field.type_, value)
  }
}

// MODEL -----------------------------------------------------------------------

pub type Model {
  Model(fields: dict.Dict(String, Field))
}

pub type FieldType {
  DateField
  IntField
}

pub type Field {
  SingleField(
    type_: FieldType,
    required: Bool,
    value: String,
    json: option.Option(Result(json.Json, String)),
  )
}

fn field_type_to_string(field_type: FieldType) {
  case field_type {
    DateField -> "date"
    IntField -> "text"
  }
}

fn field_type_update(
  field_type: FieldType,
  value: String,
) -> Result(json.Json, String) {
  case field_type {
    DateField -> {
      value |> json.string |> Ok
    }
    IntField -> {
      value
      |> int.parse
      |> result.map(json.int)
      |> result.replace_error("Invalid ID")
    }
  }
}

fn field_type_decode(
  field_type: FieldType,
  value: dynamic.Dynamic,
) -> Result(json.Json, Nil) {
  case field_type {
    DateField -> {
      value
      |> decode.run(decode.string)
      |> result.replace_error(Nil)
      |> result.then(fn(s) {
        case string.is_empty(s) {
          True -> Error(Nil)
          False -> Ok(json.string(s))
        }
      })
    }
    IntField -> {
      value
      |> decode.run(decode.int)
      |> result.replace_error(Nil)
      |> result.map(json.int)
    }
  }
}

fn get_fields() -> dict.Dict(String, Field) {
  dict.new()
  |> dict.insert(
    "date",
    SingleField(type_: DateField, required: True, value: "", json: option.None),
  )
  |> dict.insert(
    "customer_id",
    SingleField(type_: IntField, required: True, value: "", json: option.None),
  )
}

fn init(_) -> #(Model, effect.Effect(Msg)) {
  #(Model(fields: get_fields()), effect.none())
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
  let #(name, SingleField(type_:, value:, required:, json:)) = field

  html.div([], [
    html.label([attribute.for(name)], [html.text(name), html.text(": ")]),
    html.input([
      attribute.type_(field_type_to_string(type_)),
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
