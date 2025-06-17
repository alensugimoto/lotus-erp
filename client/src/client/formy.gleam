// IMPORTS ---------------------------------------------------------------------

import client/customer_combobox
import gleam/dict
import gleam/dynamic/decode
import gleam/float
import gleam/int
import gleam/json
import gleam/list
import gleam/option
import gleam/pair
import gleam/result
import gleam/string
import gleam/time/calendar.{type Date, type Month}
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

pub type NonEmptyString {
  NonEmptyString(inner: String)
}

fn non_empty_string_decoder() -> decode.Decoder(NonEmptyString) {
  use string <- decode.then(decode.string)

  string
  |> non_empty_string_new
  |> result.map(decode.success)
  |> result.map_error(decode.failure(_, "NonEmptyString"))
  |> result.unwrap_both
}

fn non_empty_string_new(
  string: String,
) -> Result(NonEmptyString, NonEmptyString) {
  case string |> string.is_empty {
    True -> "0" |> NonEmptyString |> Error
    False -> string |> NonEmptyString |> Ok
  }
}

pub type PositiveInt {
  PositiveInt(inner: Int)
}

fn positive_int_decoder() -> decode.Decoder(PositiveInt) {
  use int <- decode.then(decode.int)

  int
  |> positive_int_new
  |> result.map(decode.success)
  |> result.map_error(decode.failure(_, "PositiveInt"))
  |> result.unwrap_both
}

pub type NonNegativeFloat {
  NonNegativeFloat(inner: Float)
}

fn non_negative_float_decoder() -> decode.Decoder(NonNegativeFloat) {
  use float <- decode.then(
    decode.one_of(decode.float, or: [decode.int |> decode.map(int.to_float)]),
  )

  float
  |> non_negative_float_new
  |> result.map(decode.success)
  |> result.map_error(fn(_) {
    non_negative_float_default()
    |> decode.failure("NonNegativeFloat")
  })
  |> result.unwrap_both
}

fn non_negative_float_default() -> NonNegativeFloat {
  0.0 |> NonNegativeFloat
}

fn non_negative_float_new(float: Float) -> Result(NonNegativeFloat, String) {
  case float <. 0.0 {
    True -> "Must be greater than or equal to 0" |> Error
    False -> float |> NonNegativeFloat |> Ok
  }
}

fn date_decoder() -> decode.Decoder(Date) {
  use year <- decode.field("year", decode.int)
  use month <- decode.field("month", month_decoder())
  use day <- decode.field("day", decode.int)
  decode.success(calendar.Date(year:, month:, day:))
}

fn month_decoder() -> decode.Decoder(Month) {
  use int <- decode.then(decode.int)

  int
  |> calendar.month_from_int
  |> result.map(decode.success)
  |> result.map_error(fn(_nil) { decode.failure(calendar.January, "Month") })
  |> result.unwrap_both
}

fn date_parse(string: String) -> Result(Date, String) {
  use NonEmptyString(string) <- result.try(non_empty_string_parse(string))

  case string |> string.split("-") {
    [year, month, day] -> {
      use year <- result.try(int.parse(year))
      use month <- result.try(int.parse(month))
      use month <- result.try(calendar.month_from_int(month))
      use day <- result.try(int.parse(day))
      Ok(calendar.Date(year:, month:, day:))
    }
    _ -> Error(Nil)
  }
  |> result.replace_error("Invalid date")
}

pub type Model {
  Model(
    date: Field(Date),
    add: Field(String),
    remarks: Field(String),
    customer_remarks: Field(String),
    customer_id: option.Option(Result(Int, String)),
    sales_rep_id: Field(PositiveInt),
    buyer_name: Field(NonEmptyString),
    customer_name: Field(NonEmptyString),
    ship_via: Field(NonEmptyString),
    freight_charge: Field(NonNegativeFloat),
    warehouse_id: Field(PositiveInt),
    line_items: dict.Dict(Int, LineItemForm),
    project_name: Field(NonEmptyString),
  )
}

pub type LineItemForm {
  LineItemForm(
    item_id: Field(PositiveInt),
    quantity: Field(PositiveInt),
    unit_price: Field(NonNegativeFloat),
    commission_rate: Field(NonNegativeFloat),
    discount_rate: Field(NonNegativeFloat),
  )
}

pub type Form {
  Form(
    date: Date,
    add: String,
    remarks: String,
    customer_remarks: String,
    customer_id: Int,
    sales_rep_id: PositiveInt,
    buyer_name: NonEmptyString,
    customer_name: NonEmptyString,
    ship_via: NonEmptyString,
    freight_charge: NonNegativeFloat,
    warehouse_id: PositiveInt,
    line_items: List(LineItem),
    project_name: NonEmptyString,
  )
}

fn form_decoder() -> decode.Decoder(Form) {
  use date <- decode.field("date", date_decoder())
  use add <- decode.field("add", decode.string)
  use remarks <- decode.field("remarks", decode.string)
  use customer_remarks <- decode.field("customer_remarks", decode.string)
  use customer_id <- decode.field("customer_id", decode.int)
  use sales_rep_id <- decode.field("sales_rep_id", positive_int_decoder())
  use buyer_name <- decode.field("buyer_name", non_empty_string_decoder())
  use customer_name <- decode.field("customer_name", non_empty_string_decoder())
  use ship_via <- decode.field("ship_via", non_empty_string_decoder())
  use freight_charge <- decode.field(
    "freight_charge",
    non_negative_float_decoder(),
  )
  use warehouse_id <- decode.field("warehouse_id", positive_int_decoder())
  use line_items <- decode.field("line_items", decode.list(line_item_decoder()))
  use project_name <- decode.field("project_name", non_empty_string_decoder())
  decode.success(Form(
    date:,
    add:,
    remarks:,
    customer_remarks:,
    customer_id:,
    sales_rep_id:,
    buyer_name:,
    customer_name:,
    ship_via:,
    freight_charge:,
    warehouse_id:,
    line_items:,
    project_name:,
  ))
}

fn positive_int_new(int: Int) -> Result(PositiveInt, PositiveInt) {
  case int > 0 {
    True -> int |> PositiveInt |> Ok
    False -> 1 |> PositiveInt |> Error
  }
}

fn encode_form(form: Form) -> json.Json {
  let Form(
    date:,
    add:,
    remarks:,
    customer_remarks:,
    customer_id:,
    sales_rep_id:,
    buyer_name:,
    customer_name:,
    ship_via:,
    freight_charge:,
    warehouse_id:,
    line_items:,
    project_name:,
  ) = form

  json.object([
    #("date", encode_date(date)),
    #("add", json.string(add)),
    #("remarks", json.string(remarks)),
    #("customer_remarks", json.string(customer_remarks)),
    #("customer_id", json.int(customer_id)),
    #("sales_rep_id", json.int(sales_rep_id.inner)),
    #("buyer_name", json.string(buyer_name.inner)),
    #("customer_name", json.string(customer_name.inner)),
    #("ship_via", json.string(ship_via.inner)),
    #("freight_charge", json.float(freight_charge.inner)),
    #("warehouse_id", json.int(warehouse_id.inner)),
    #("line_items", json.array(line_items, encode_line_item)),
    #("project_name", json.string(project_name.inner)),
  ])
}

fn encode_date(date: Date) -> json.Json {
  let calendar.Date(year:, month:, day:) = date

  json.object([
    #("year", json.int(year)),
    #("month", month |> calendar.month_to_int |> json.int),
    #("day", json.int(day)),
  ])
}

pub type LineItem {
  LineItem(
    item_id: PositiveInt,
    quantity: PositiveInt,
    unit_price: NonNegativeFloat,
    commission_rate: NonNegativeFloat,
    discount_rate: NonNegativeFloat,
  )
}

fn encode_line_item(line_item: LineItem) -> json.Json {
  let LineItem(
    item_id:,
    quantity:,
    unit_price:,
    commission_rate:,
    discount_rate:,
  ) = line_item

  json.object([
    #("item_id", json.int(item_id.inner)),
    #("quantity", json.int(quantity.inner)),
    #("unit_price", json.float(unit_price.inner)),
    #("commission_rate", json.float(commission_rate.inner)),
    #("discount_rate", json.float(discount_rate.inner)),
  ])
}

fn line_item_decoder() -> decode.Decoder(LineItem) {
  use item_id <- decode.field("item_id", positive_int_decoder())
  use quantity <- decode.field("quantity", positive_int_decoder())
  use unit_price <- decode.field("unit_price", non_negative_float_decoder())
  use commission_rate <- decode.field(
    "commission_rate",
    non_negative_float_decoder(),
  )
  use discount_rate <- decode.field(
    "discount_rate",
    non_negative_float_decoder(),
  )
  decode.success(LineItem(
    item_id:,
    quantity:,
    unit_price:,
    commission_rate:,
    discount_rate:,
  ))
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

fn update_parsed_value(
  field: Field(a),
  fun: fn(String) -> Result(a, String),
) -> Field(a) {
  Field(
    ..field,
    parsed_value: field
      |> get_parsed_value(fun)
      |> option.Some,
  )
}

fn update_values(model: Model) -> Model {
  let Model(
    date:,
    add:,
    remarks:,
    customer_remarks:,
    customer_id:,
    sales_rep_id:,
    buyer_name:,
    customer_name:,
    ship_via:,
    freight_charge:,
    warehouse_id:,
    project_name:,
    line_items:,
  ) = model

  Model(
    date: date
      |> update_parsed_value(date_parse),
    customer_id: customer_id
      |> option.lazy_or(fn() { required |> Error |> option.Some }),
    add: add
      |> update_parsed_value(Ok),
    remarks: remarks
      |> update_parsed_value(Ok),
    customer_remarks: customer_remarks
      |> update_parsed_value(Ok),
    sales_rep_id: sales_rep_id
      |> update_parsed_value(positive_int_parse),
    buyer_name: buyer_name
      |> update_parsed_value(non_empty_string_parse),
    customer_name: customer_name
      |> update_parsed_value(non_empty_string_parse),
    ship_via: ship_via
      |> update_parsed_value(non_empty_string_parse),
    freight_charge: freight_charge
      |> update_parsed_value(non_negative_float_parse),
    warehouse_id: warehouse_id
      |> update_parsed_value(positive_int_parse),
    project_name: project_name
      |> update_parsed_value(non_empty_string_parse),
    line_items: line_items
      |> dict.map_values(fn(_, line_item) {
        let LineItemForm(
          item_id:,
          quantity:,
          unit_price:,
          commission_rate:,
          discount_rate:,
        ) = line_item

        LineItemForm(
          item_id: item_id
            |> update_parsed_value(positive_int_parse),
          quantity: quantity
            |> update_parsed_value(positive_int_parse),
          unit_price: unit_price
            |> update_parsed_value(non_negative_float_parse),
          commission_rate: commission_rate
            |> update_parsed_value(non_negative_float_parse),
          discount_rate: discount_rate
            |> update_parsed_value(non_negative_float_parse),
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
  let Model(
    date:,
    add:,
    remarks:,
    customer_remarks:,
    customer_id:,
    sales_rep_id:,
    buyer_name:,
    customer_name:,
    ship_via:,
    freight_charge:,
    warehouse_id:,
    project_name:,
    line_items:,
  ) = model

  use date <- result.try(
    date
    |> get_parsed_value(date_parse),
  )
  use add <- result.try(
    add
    |> get_parsed_value(Ok),
  )
  use remarks <- result.try(
    remarks
    |> get_parsed_value(Ok),
  )
  use customer_remarks <- result.try(
    customer_remarks
    |> get_parsed_value(Ok),
  )
  use customer_id <- result.try(
    customer_id
    |> option.lazy_unwrap(fn() { required |> Error }),
  )
  use sales_rep_id <- result.try(
    sales_rep_id
    |> get_parsed_value(positive_int_parse),
  )
  use buyer_name <- result.try(
    buyer_name
    |> get_parsed_value(non_empty_string_parse),
  )
  use customer_name <- result.try(
    customer_name
    |> get_parsed_value(non_empty_string_parse),
  )
  use ship_via <- result.try(
    ship_via
    |> get_parsed_value(non_empty_string_parse),
  )
  use freight_charge <- result.try(
    freight_charge
    |> get_parsed_value(non_negative_float_parse),
  )
  use warehouse_id <- result.try(
    warehouse_id
    |> get_parsed_value(positive_int_parse),
  )
  use project_name <- result.try(
    project_name
    |> get_parsed_value(non_empty_string_parse),
  )
  use line_items <- result.try(
    line_items
    |> line_items_dict_to_list
    |> list.try_map(fn(pair) {
      let #(
        _,
        LineItemForm(
          item_id:,
          quantity:,
          unit_price:,
          commission_rate:,
          discount_rate:,
        ),
      ) = pair
      use item_id <- result.try(
        item_id
        |> get_parsed_value(positive_int_parse),
      )
      use quantity <- result.try(
        quantity
        |> get_parsed_value(positive_int_parse),
      )
      use unit_price <- result.try(
        unit_price
        |> get_parsed_value(non_negative_float_parse),
      )
      use commission_rate <- result.try(
        commission_rate
        |> get_parsed_value(non_negative_float_parse),
      )
      use discount_rate <- result.try(
        discount_rate
        |> get_parsed_value(non_negative_float_parse),
      )
      LineItem(
        item_id:,
        quantity:,
        unit_price:,
        commission_rate:,
        discount_rate:,
      )
      |> Ok
    }),
  )
  Form(
    date:,
    customer_id:,
    line_items:,
    add:,
    remarks:,
    customer_remarks:,
    sales_rep_id:,
    buyer_name:,
    customer_name:,
    ship_via:,
    freight_charge:,
    warehouse_id:,
    project_name:,
  )
  |> Ok
}

// NOTE: `value` is not being used currently and can be removed
// like with `customer_id`
pub opaque type Field(a) {
  Field(value: String, parsed_value: option.Option(Result(a, String)))
}

fn new_field() -> Field(a) {
  Field(value: "", parsed_value: option.None)
}

fn init(_) -> #(Model, effect.Effect(Msg)) {
  Model(
    date: new_field(),
    add: new_field(),
    remarks: new_field(),
    customer_remarks: new_field(),
    customer_id: option.None,
    sales_rep_id: new_field(),
    buyer_name: new_field(),
    customer_name: new_field(),
    ship_via: new_field(),
    freight_charge: new_field(),
    warehouse_id: new_field(),
    project_name: new_field(),
    line_items: dict.new(),
  )
  |> pair.new(effect.none())
}

// UPDATE ----------------------------------------------------------------------

pub type Msg {
  UserClickedSave
  //
  UserAddedLineItem
  UserRemovedLineItem(Int)
  //
  UserUpdatedDate(String)
  UserUpdatedCustomerId(Int)
  UserUpdatedShipVia(String)
  UserUpdatedWarehouseId(String)
  UserUpdatedFreightCharge(String)
  UserUpdatedProjectName(String)
  UserUpdatedAdd(String)
  UserUpdatedRemarks(String)
  UserUpdatedCustomerRemarks(String)
  UserUpdatedSalesRepId(String)
  UserUpdatedBuyerName(String)
  UserUpdatedCustomerName(String)
  //
  UserUpdatedItemId(Int, String)
  UserUpdatedQuantity(Int, String)
  UserUpdatedCommissionRate(Int, String)
  UserUpdatedUnitPrice(Int, String)
  UserUpdatedDiscountRate(Int, String)
}

const required = "Required"

fn non_empty_string_parse(value: String) -> Result(NonEmptyString, String) {
  case string.is_empty(value) {
    True -> required |> Error
    False -> value |> NonEmptyString |> Ok
  }
}

fn positive_int_parse(string: String) -> Result(PositiveInt, String) {
  use NonEmptyString(string) <- result.try(
    string
    |> non_empty_string_parse,
  )
  use int <- result.try(
    string
    |> int.parse
    |> result.replace_error("Must be an integer"),
  )
  case int > 0 {
    True -> int |> PositiveInt |> Ok
    False -> "Must be greater than 0" |> Error
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

    UserUpdatedDate(value) -> {
      Model(
        ..model,
        date: Field(
          value:,
          parsed_value: value
            |> date_parse
            |> option.Some,
        ),
      )
      |> pair.new(effect.none())
    }

    UserUpdatedCustomerId(value) -> {
      Model(..model, customer_id: value |> Ok |> option.Some)
      |> pair.new(effect.none())
    }

    UserUpdatedItemId(line_num, value) -> {
      model
      |> update_line_item(line_num, fn(line_item) {
        LineItemForm(
          ..line_item,
          item_id: Field(
            value:,
            parsed_value: value
              |> positive_int_parse
              |> option.Some,
          ),
        )
      })
      |> pair.new(effect.none())
    }

    UserUpdatedQuantity(line_num, value) -> {
      model
      |> update_line_item(line_num, fn(line_item) {
        LineItemForm(
          ..line_item,
          quantity: Field(
            value:,
            parsed_value: value
              |> positive_int_parse
              |> option.Some,
          ),
        )
      })
      |> pair.new(effect.none())
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
        |> dict.insert(max_line_num + 1, new_line_item_form())
      Model(..model, line_items:)
      |> pair.new(effect.none())
    }

    UserRemovedLineItem(line_num) -> {
      let Model(line_items:, ..) = model
      let line_items =
        line_items
        |> dict.delete(line_num)
      Model(..model, line_items:)
      |> pair.new(effect.none())
    }

    UserUpdatedShipVia(value) -> {
      Model(
        ..model,
        ship_via: Field(
          value:,
          parsed_value: value
            |> non_empty_string_parse
            |> option.Some,
        ),
      )
      |> pair.new(effect.none())
    }

    UserUpdatedWarehouseId(value) -> {
      Model(
        ..model,
        warehouse_id: Field(
          value:,
          parsed_value: value
            |> positive_int_parse
            |> option.Some,
        ),
      )
      |> pair.new(effect.none())
    }

    UserUpdatedFreightCharge(value) -> {
      Model(
        ..model,
        freight_charge: Field(
          value:,
          parsed_value: value
            |> non_negative_float_parse
            |> option.Some,
        ),
      )
      |> pair.new(effect.none())
    }

    UserUpdatedProjectName(value) -> {
      Model(
        ..model,
        project_name: Field(
          value:,
          parsed_value: value
            |> non_empty_string_parse
            |> option.Some,
        ),
      )
      |> pair.new(effect.none())
    }

    UserUpdatedAdd(value) -> {
      Model(
        ..model,
        add: Field(
          value:,
          parsed_value: value
            |> Ok
            |> option.Some,
        ),
      )
      |> pair.new(effect.none())
    }

    UserUpdatedRemarks(value) -> {
      Model(
        ..model,
        remarks: Field(
          value:,
          parsed_value: value
            |> Ok
            |> option.Some,
        ),
      )
      |> pair.new(effect.none())
    }

    UserUpdatedCustomerRemarks(value) -> {
      Model(
        ..model,
        customer_remarks: Field(
          value:,
          parsed_value: value
            |> Ok
            |> option.Some,
        ),
      )
      |> pair.new(effect.none())
    }

    UserUpdatedSalesRepId(value) -> {
      Model(
        ..model,
        sales_rep_id: Field(
          value:,
          parsed_value: value
            |> positive_int_parse
            |> option.Some,
        ),
      )
      |> pair.new(effect.none())
    }

    UserUpdatedBuyerName(value) -> {
      Model(
        ..model,
        buyer_name: Field(
          value:,
          parsed_value: value
            |> non_empty_string_parse
            |> option.Some,
        ),
      )
      |> pair.new(effect.none())
    }

    UserUpdatedCustomerName(value) -> {
      Model(
        ..model,
        customer_name: Field(
          value:,
          parsed_value: value
            |> non_empty_string_parse
            |> option.Some,
        ),
      )
      |> pair.new(effect.none())
    }

    UserUpdatedCommissionRate(line_num, value) -> {
      model
      |> update_line_item(line_num, fn(line_item) {
        LineItemForm(
          ..line_item,
          commission_rate: Field(
            value:,
            parsed_value: value
              |> non_negative_float_parse
              |> option.Some,
          ),
        )
      })
      |> pair.new(effect.none())
    }

    UserUpdatedDiscountRate(line_num, value) -> {
      model
      |> update_line_item(line_num, fn(line_item) {
        LineItemForm(
          ..line_item,
          discount_rate: Field(
            value:,
            parsed_value: value
              |> non_negative_float_parse
              |> option.Some,
          ),
        )
      })
      |> pair.new(effect.none())
    }

    UserUpdatedUnitPrice(line_num, value) -> {
      model
      |> update_line_item(line_num, fn(line_item) {
        LineItemForm(
          ..line_item,
          unit_price: Field(
            value:,
            parsed_value: value
              |> non_negative_float_parse
              |> option.Some,
          ),
        )
      })
      |> pair.new(effect.none())
    }
  }
}

fn new_line_item_form() -> LineItemForm {
  LineItemForm(
    item_id: new_field(),
    quantity: new_field(),
    unit_price: new_field(),
    commission_rate: new_field(),
    discount_rate: new_field(),
  )
}

fn update_line_item(
  model: Model,
  update: Int,
  fun: fn(LineItemForm) -> LineItemForm,
) -> Model {
  let Model(line_items:, ..) = model
  let line_items =
    line_items
    |> dict.upsert(update:, with: fn(line_item) {
      line_item
      |> option.lazy_unwrap(new_line_item_form)
      |> fun
    })
  Model(..model, line_items:)
}

fn non_negative_float_parse(string: String) -> Result(NonNegativeFloat, String) {
  use NonEmptyString(string) <- result.try(
    string
    |> non_empty_string_parse,
  )
  use float <- result.try(
    string
    |> float.parse
    |> result.try_recover(fn(_nil) {
      string
      |> int.parse
      |> result.map(int.to_float)
    })
    |> result.replace_error("Must be a number"),
  )
  float
  |> non_negative_float_new
}

// VIEW ------------------------------------------------------------------------

fn view(model: Model) -> Element(Msg) {
  let Model(
    date:,
    add:,
    remarks:,
    customer_remarks:,
    customer_id: _,
    sales_rep_id:,
    buyer_name:,
    customer_name:,
    ship_via:,
    freight_charge:,
    warehouse_id:,
    project_name:,
    line_items:,
  ) = model

  html.div([], [
    customer_combobox.element(
      [customer_combobox.on_change(UserUpdatedCustomerId)],
      [],
    ),
    view_input(
      name: "date",
      type_: "date",
      on_input: UserUpdatedDate,
      field: date,
    ),
    view_input(name: "add", type_: "text", on_input: UserUpdatedAdd, field: add),
    view_input(
      name: "remarks",
      type_: "text",
      on_input: UserUpdatedRemarks,
      field: remarks,
    ),
    view_input(
      name: "customer_remarks",
      type_: "text",
      on_input: UserUpdatedCustomerRemarks,
      field: customer_remarks,
    ),
    view_input(
      name: "sales_rep_id",
      type_: "text",
      on_input: UserUpdatedSalesRepId,
      field: sales_rep_id,
    ),
    view_input(
      name: "buyer_name",
      type_: "text",
      on_input: UserUpdatedBuyerName,
      field: buyer_name,
    ),
    view_input(
      name: "customer_name",
      type_: "text",
      on_input: UserUpdatedCustomerName,
      field: customer_name,
    ),
    view_input(
      name: "ship_via",
      type_: "text",
      on_input: UserUpdatedShipVia,
      field: ship_via,
    ),
    view_input(
      name: "freight_charge",
      type_: "text",
      on_input: UserUpdatedFreightCharge,
      field: freight_charge,
    ),
    view_input(
      name: "warehouse_id",
      type_: "text",
      on_input: UserUpdatedWarehouseId,
      field: warehouse_id,
    ),
    view_input(
      name: "project_name",
      type_: "text",
      on_input: UserUpdatedProjectName,
      field: project_name,
    ),
    html.div([], [
      keyed.div(
        [],
        line_items
          |> line_items_dict_to_list
          |> list.map(fn(line_item) {
            let #(
              line_num,
              LineItemForm(
                item_id:,
                quantity:,
                unit_price:,
                commission_rate:,
                discount_rate:,
              ),
            ) = line_item
            #(
              int.to_string(line_num),
              html.div([], [
                view_input(
                  name: "item_id",
                  type_: "text",
                  on_input: UserUpdatedItemId(line_num, _),
                  field: item_id,
                ),
                view_input(
                  name: "quantity",
                  type_: "text",
                  on_input: UserUpdatedQuantity(line_num, _),
                  field: quantity,
                ),
                view_input(
                  name: "unit_price",
                  type_: "text",
                  on_input: UserUpdatedUnitPrice(line_num, _),
                  field: unit_price,
                ),
                view_input(
                  name: "commission_rate",
                  type_: "text",
                  on_input: UserUpdatedCommissionRate(line_num, _),
                  field: commission_rate,
                ),
                view_input(
                  name: "discount_rate",
                  type_: "text",
                  on_input: UserUpdatedDiscountRate(line_num, _),
                  field: discount_rate,
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
  on_input on_input: fn(String) -> Msg,
  field field: Field(a),
) {
  let Field(value:, parsed_value:) = field

  html.div([], [
    html.label([attribute.for(name)], [html.text(name), html.text(": ")]),
    html.input([
      attribute.type_(type_),
      attribute.id(name),
      attribute.name(name),
      event.on_input(on_input),
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
