// IMPORTS ---------------------------------------------------------------------

import gleam/dict
import gleam/dynamic/decode
import gleam/int
import gleam/json
import gleam/list
import gleam/option
import gleam/result
import gleam/string
import lustre
import lustre/attribute.{type Attribute}
import lustre/component
import lustre/effect
import lustre/element.{type Element}
import lustre/element/html
import lustre/element/keyed
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
  Model(
    date: Field(String),
    customer_id: Field(Int),
    line_items: dict.Dict(Int, LineItemForm),
  )
}

pub type LineItemForm {
  LineItemForm(item_id: Field(Int), quantity: Field(Int))
}

pub type Form {
  Form(date: String, customer_id: Int, line_items: List(LineItem))
}

fn encode_form(form: Form) -> json.Json {
  let Form(date:, customer_id:, line_items:) = form
  json.object([
    #("date", json.string(date)),
    #("customer_id", json.int(customer_id)),
    #("line_items", json.array(line_items, encode_line_item)),
  ])
}

pub type LineItem {
  LineItem(item_id: Int, quantity: Int)
}

fn encode_line_item(line_item: LineItem) -> json.Json {
  let LineItem(item_id:, quantity:) = line_item
  json.object([
    #("item_id", json.int(item_id)),
    #("quantity", json.int(quantity)),
  ])
}

fn line_item_decoder() -> decode.Decoder(LineItem) {
  use item_id <- decode.field("item_id", decode.int)
  use quantity <- decode.field("quantity", decode.int)
  decode.success(LineItem(item_id:, quantity:))
}

fn form_decoder() -> decode.Decoder(Form) {
  use date <- decode.field("date", decode.string)
  use customer_id <- decode.field("customer_id", decode.int)
  use line_items <- decode.field("line_items", decode.list(line_item_decoder()))
  decode.success(Form(date:, customer_id:, line_items:))
}

fn get_parsed_value(
  field: Field(a),
  parse: fn(String) -> Result(a, String),
) -> Result(a, String) {
  case field.parsed_value {
    option.None -> field.value |> parse
    option.Some(parsed_value) -> parsed_value
  }
}

fn update_values(model: Model) -> Model {
  let Model(date:, customer_id:, line_items:) = model

  Model(
    date: Field(
      ..date,
      parsed_value: date
        |> get_parsed_value(date_parse)
        |> option.Some,
    ),
    customer_id: Field(
      ..customer_id,
      parsed_value: customer_id
        |> get_parsed_value(customer_id_parse)
        |> option.Some,
    ),
    line_items: line_items
      |> dict.map_values(fn(_, line_item) {
        let LineItemForm(item_id:, quantity:) = line_item

        LineItemForm(
          item_id: Field(
            ..item_id,
            parsed_value: item_id
              |> get_parsed_value(item_id_parse)
              |> option.Some,
          ),
          quantity: Field(
            ..quantity,
            parsed_value: quantity
              |> get_parsed_value(quantity_parse)
              |> option.Some,
          ),
        )
      }),
  )
}

fn line_items_dict_to_list(
  dict: dict.Dict(Int, LineItemForm),
) -> List(#(Int, LineItemForm)) {
  dict
  |> dict.to_list
  |> list.sort(fn(a, b) { int.compare(a.0, b.0) })
}

fn model_to_form(model: Model) -> Result(Form, String) {
  let Model(date:, customer_id:, line_items:) = model
  use date <- result.try(
    date
    |> get_parsed_value(date_parse),
  )
  use customer_id <- result.try(
    customer_id
    |> get_parsed_value(customer_id_parse),
  )
  use line_items <- result.try(
    line_items
    |> line_items_dict_to_list
    |> list.try_map(fn(pair) {
      let #(_, LineItemForm(item_id:, quantity:)) = pair
      use item_id <- result.try(item_id |> get_parsed_value(item_id_parse))
      use quantity <- result.try(quantity |> get_parsed_value(quantity_parse))
      LineItem(item_id:, quantity:) |> Ok
    }),
  )
  Form(date:, customer_id:, line_items:) |> Ok
}

pub type Field(a) {
  Field(value: String, parsed_value: option.Option(Result(a, String)))
}

fn init(_) -> #(Model, effect.Effect(Msg)) {
  #(
    Model(
      date: Field(value: "", parsed_value: option.None),
      customer_id: Field(value: "", parsed_value: option.None),
      line_items: dict.new(),
    ),
    effect.none(),
  )
}

// UPDATE ----------------------------------------------------------------------

pub type FieldMsg {
  DateMsg(String)
  CustomerIdMsg(String)
  ItemIdMsg(Int, String)
  QuantityMsg(Int, String)
}

pub type Msg {
  UserClickedSave
  UserUpdatedField(FieldMsg)
  UserAddedLineItem
  UserRemovedLineItem(Int)
}

fn date_parse(value: String) -> Result(String, String) {
  case
    value
    |> string.is_empty
  {
    True -> Error("Required")
    False -> Ok(value)
  }
}

fn customer_id_parse(value: String) -> Result(Int, String) {
  case
    value
    |> string.is_empty
  {
    True -> Error("Required")
    False ->
      value
      |> int.parse
      |> result.replace_error("Invalid ID")
  }
}

fn item_id_parse(value: String) -> Result(Int, String) {
  case
    value
    |> string.is_empty
  {
    True -> Error("Required")
    False ->
      value
      |> int.parse
      |> result.replace_error("Invalid integer")
  }
}

fn quantity_parse(value: String) -> Result(Int, String) {
  case
    value
    |> string.is_empty
  {
    True -> Error("Required")
    False ->
      value
      |> int.parse
      |> result.replace_error("Invalid integer")
  }
}

fn update(model: Model, msg: Msg) -> #(Model, effect.Effect(Msg)) {
  case msg {
    UserClickedSave -> {
      let model =
        model
        |> update_values

      let effect =
        model
        |> model_to_form
        |> result.map(fn(form) {
          form
          |> encode_form
          |> event.emit(event_name, _)
        })
        |> result.lazy_unwrap(effect.none)

      #(model, effect)
    }

    UserUpdatedField(field_update) -> {
      case field_update {
        DateMsg(value) -> {
          let parsed_value = value |> date_parse |> option.Some
          let date = Field(value:, parsed_value:)
          let model = Model(..model, date:)
          #(model, effect.none())
        }
        CustomerIdMsg(value) -> {
          let parsed_value = value |> customer_id_parse |> option.Some
          let customer_id = Field(value:, parsed_value:)
          let model = Model(..model, customer_id:)
          #(model, effect.none())
        }
        ItemIdMsg(line_num, value) -> {
          let Model(line_items:, ..) = model
          let parsed_value = value |> item_id_parse |> option.Some
          let item_id = Field(value:, parsed_value:)
          let line_items =
            line_items
            |> dict.upsert(line_num, fn(line_item) {
              case line_item {
                option.None ->
                  LineItemForm(
                    item_id:,
                    quantity: Field(value: "", parsed_value: option.None),
                  )
                option.Some(line_item) -> LineItemForm(..line_item, item_id:)
              }
            })
          let model = Model(..model, line_items:)
          #(model, effect.none())
        }
        QuantityMsg(line_num, value) -> {
          let Model(line_items:, ..) = model
          let parsed_value = value |> quantity_parse |> option.Some
          let quantity = Field(value:, parsed_value:)
          let line_items =
            line_items
            |> dict.upsert(line_num, fn(line_item) {
              case line_item {
                option.None ->
                  LineItemForm(
                    quantity:,
                    item_id: Field(value: "", parsed_value: option.None),
                  )
                option.Some(line_item) -> LineItemForm(..line_item, quantity:)
              }
            })
          let model = Model(..model, line_items:)
          #(model, effect.none())
        }
      }
    }

    UserAddedLineItem -> {
      let Model(line_items:, ..) = model
      let max_line_num =
        line_items
        |> dict.keys
        |> list.max(int.compare)
        |> result.unwrap(0)
      let line_items =
        line_items
        |> dict.insert(
          max_line_num + 1,
          LineItemForm(
            item_id: Field(value: "", parsed_value: option.None),
            quantity: Field(value: "", parsed_value: option.None),
          ),
        )
      let model = Model(..model, line_items:)
      #(model, effect.none())
    }

    UserRemovedLineItem(line_num) -> {
      let Model(line_items:, ..) = model
      let line_items =
        line_items
        |> dict.delete(line_num)
      let model = Model(..model, line_items:)
      #(model, effect.none())
    }
  }
}

// VIEW ------------------------------------------------------------------------

fn view(model: Model) -> Element(Msg) {
  let Model(date:, customer_id:, line_items:) = model

  html.div([], [
    view_input(name: "date", type_: "date", on_input: DateMsg, field: date),
    view_input(
      name: "customer_id",
      type_: "text",
      on_input: CustomerIdMsg,
      field: customer_id,
    ),
    html.div([], [
      keyed.div(
        [],
        line_items
          |> line_items_dict_to_list
          |> list.map(fn(line_item) {
            let #(line_num, LineItemForm(item_id:, quantity:)) = line_item
            #(
              int.to_string(line_num),
              html.div([], [
                view_input(
                  name: "item_id",
                  type_: "text",
                  on_input: ItemIdMsg(line_num, _),
                  field: item_id,
                ),
                view_input(
                  name: "quantity",
                  type_: "text",
                  on_input: QuantityMsg(line_num, _),
                  field: quantity,
                ),
                html.button([event.on_click(UserRemovedLineItem(line_num))], [
                  html.text("Remove"),
                ]),
              ]),
            )
          }),
      ),
      html.button([event.on_click(UserAddedLineItem)], [html.text("Add")]),
    ]),
    html.button([event.on_click(UserClickedSave)], [html.text("Save")]),
  ])
}

fn view_input(
  name name: String,
  type_ type_: String,
  on_input on_input: fn(String) -> FieldMsg,
  field field: Field(a),
) {
  let Field(value:, parsed_value:) = field

  html.div([], [
    html.label([attribute.for(name)], [html.text(name), html.text(": ")]),
    html.input([
      attribute.type_(type_),
      attribute.id(name),
      attribute.name(name),
      event.on_input(fn(value) {
        value
        |> on_input
        |> UserUpdatedField
      }),
      attribute.value(value),
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
