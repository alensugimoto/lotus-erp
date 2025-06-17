// IMPORTS ---------------------------------------------------------------------

import client/ui/input.{input}
import client/ui/primitives/icon
import gleam/bool
import gleam/dynamic
import gleam/dynamic/decode.{type Dynamic}
import gleam/json
import gleam/list
import gleam/option
import gleam/result
import gleam/set
import gleam/string
import lustre
import lustre/attribute.{type Attribute, attribute}
import lustre/component
import lustre/effect.{type Effect}
import lustre/element.{type Element}
import lustre/element/html
import lustre/element/keyed
import lustre/event
import lustre/server_component

// TYPES -----------------------------------------------------------------------

type Option {
  Option(value: String, label: String, has_content: Bool)
}

pub opaque type ComboboxOption(msg) {
  ComboboxOption(
    value: String,
    label: String,
    selected: Bool,
    content: option.Option(List(Element(msg))),
  )
}

// ELEMENTS --------------------------------------------------------------------

pub const name = "lustre-ui-combobox"

const option_name = name <> "-option"

pub fn register() -> Result(Nil, lustre.Error) {
  lustre.component(init, update, view, [component.open_shadow_root(True)])
  |> lustre.register(name)
}

fn content_key(value: String) -> String {
  value <> "-content"
}

const has_content_attribute = "has_content"

pub fn element(
  attributes: List(Attribute(msg)),
  children: List(ComboboxOption(msg)),
) -> Element(msg) {
  keyed.element(name, attributes, {
    use ComboboxOption(value:, label:, selected:, content:) <- list.flat_map(
      children,
    )
    let option = #(
      value <> "-option",
      element.element(
        option_name,
        [
          attribute.value(value),
          case selected {
            True -> attribute.selected(True)
            False -> attribute.none()
          },
          case content {
            option.Some(_) -> attribute.attribute(has_content_attribute, "")
            option.None -> attribute.none()
          },
        ],
        [html.text(label)],
      ),
    )

    case content {
      option.None -> [option]
      option.Some(content) -> {
        let content_key = value |> content_key
        [
          option,
          #(content_key, html.div([component.slot(content_key)], content)),
        ]
      }
    }
  })
}

pub fn option(
  value value: String,
  label label: String,
  selected selected: Bool,
  content content: option.Option(List(Element(msg))),
) -> ComboboxOption(msg) {
  ComboboxOption(value:, label:, selected:, content:)
}

// EVENTS ----------------------------------------------------------------------

const detail_key = "detail"

const query_key = "query"

const query_event_name = "query"

const value_key = "value"

const change_event_name = "change"

pub fn on_query(handler: fn(String) -> msg) -> Attribute(msg) {
  let key = [detail_key, query_key]
  event.on(query_event_name, {
    decode.at(key, decode.string)
    |> decode.map(handler)
  })
  |> server_component.include([key |> string.join(".")])
}

fn emit_query(query: String) -> Effect(msg) {
  event.emit(query_event_name, json.object([#(query_key, json.string(query))]))
}

pub fn on_change(handler: fn(String) -> msg) -> Attribute(msg) {
  let key = [detail_key, value_key]
  event.on(change_event_name, {
    decode.at(key, decode.string)
    |> decode.map(handler)
  })
  |> server_component.include([key |> string.join(".")])
}

fn emit_change(value: String) -> Effect(msg) {
  event.emit(change_event_name, json.object([#(value_key, json.string(value))]))
}

// MODEL -----------------------------------------------------------------------

type Model {
  Model(
    value: option.Option(String),
    query: String,
    intent: option.Option(String),
    options: List(Option),
    loading: Bool,
  )
}

fn init(_) -> #(Model, Effect(Msg)) {
  #(
    Model(
      value: option.None,
      query: "",
      intent: option.None,
      options: [],
      loading: False,
    ),
    effect.none(),
  )
}

// UPDATE ----------------------------------------------------------------------

type Msg {
  ParentChangedChildren(List(Option), option.Option(String))
  UserChangedQuery(String)
  UserHoveredOption(String)
  UserPressedKey(String)
  UserSelectedOption(String)
}

fn update(model: Model, msg: Msg) -> #(Model, Effect(Msg)) {
  case msg {
    ParentChangedChildren(options, selection) -> {
      let intent =
        options
        |> list.find(fn(option) { option.has_content })
        |> option.from_result
        |> option.map(fn(option) { option.value })
      let model =
        Model(..model, value: selection, options:, intent:, loading: False)
      let effect = effect.none()

      #(model, effect)
    }

    UserChangedQuery(query) -> {
      let effect = query |> emit_query
      let model = Model(..model, query:, loading: True)

      #(model, effect)
    }

    UserPressedKey("Tab") -> {
      // TODO: check if needed
      let effect = hide_popover()
      #(model, effect)
    }

    UserHoveredOption(intent) -> #(
      Model(..model, intent: option.Some(intent)),
      effect.none(),
    )

    UserPressedKey("ArrowDown") -> {
      let intent = case model.intent {
        option.Some(intent) ->
          model.options
          |> list.fold_until(option.None, fn(acc, option) {
            case acc {
              option.Some(_) -> option.value |> option.Some |> list.Stop
              option.None ->
                case option.value == intent {
                  True -> "" |> option.Some
                  False -> option.None
                }
                |> list.Continue
            }
          })

        option.None ->
          model.options
          |> list.first
          |> option.from_result
          |> option.map(fn(option) { option.value })
      }

      let model = Model(..model, intent:)
      let effect = effect.none()

      #(model, effect)
    }

    UserPressedKey("End") -> {
      let intent =
        model.options
        |> list.last
        |> option.from_result
        |> option.map(fn(option) { option.value })
      let model = Model(..model, intent:)
      let effect = effect.none()

      #(model, effect)
    }

    UserPressedKey("Enter") -> {
      let model =
        Model(
          ..model,
          value: model.intent
            |> option.or(model.value),
        )
      let effect = case model.intent {
        option.Some(value) ->
          effect.batch([value |> emit_change, hide_popover()])
        option.None -> hide_popover()
      }

      #(model, effect)
    }

    UserPressedKey("Escape") -> {
      // TODO: check if needed
      let effect = hide_popover()
      #(model, effect)
    }

    UserPressedKey("Home") -> {
      let intent =
        model.options
        |> list.first
        |> option.from_result
        |> option.map(fn(option) { option.value })
      let model = Model(..model, intent:)
      let effect = effect.none()

      #(model, effect)
    }

    UserPressedKey("ArrowUp") -> {
      let intent = case model.intent {
        option.Some(intent) ->
          model.options
          |> list.reverse
          |> list.fold_until(option.None, fn(acc, option) {
            case acc {
              option.Some(_) -> option.value |> option.Some |> list.Stop
              option.None ->
                case option.value == intent {
                  True -> "" |> option.Some
                  False -> option.None
                }
                |> list.Continue
            }
          })
        option.None ->
          model.options
          |> list.last
          |> option.from_result
          |> option.map(fn(option) { option.value })
      }

      let model = Model(..model, intent:)
      let effect = effect.none()

      #(model, effect)
    }

    UserPressedKey(_key) -> {
      #(model, effect.none())
    }

    UserSelectedOption(value) -> {
      let model =
        Model(
          ..model,
          value: value
            |> option.Some,
        )
      let effect = effect.batch([value |> emit_change, hide_popover()])

      #(model, effect)
    }
  }
}

// EFFECTS ---------------------------------------------------------------------

fn hide_popover() -> Effect(msg) {
  // TODO: check before paint after
  use _dispatch, root <- effect.after_paint
  do_hide_popover(root)
}

@external(javascript, "../../dom.ffi.mjs", "hide_popover")
fn do_hide_popover(root: Dynamic) -> Nil

// VIEW ------------------------------------------------------------------------

const popovertarget = "mypopover"

fn view(model: Model) -> Element(Msg) {
  let label =
    case model.value {
      option.Some(value) ->
        model.options
        |> list.find(fn(option) { option.value == value })
        |> result.map(fn(option) { option.label })
      option.None -> Error(Nil)
    }
    |> result.unwrap("")

  element.fragment([
    component.default_slot(
      [attribute.hidden(True), event.on("slotchange", handle_slot_change())],
      [],
    ),
    html.button([attribute.popovertarget(popovertarget)], [
      html.span([attribute("part", "combobox-trigger-label")], [
        html.text(label),
      ]),
      icon.chevron_down([attribute("part", "combobox-trigger-icon")]),
    ]),
    html.div([attribute.id(popovertarget), attribute.popover("")], [
      view_input(model.query),
      view_options(
        model.options
          |> list.filter(fn(option) { option.has_content }),
        model.value,
        model.intent,
      ),
    ]),
  ])
}

fn options(
  children: Dynamic,
) -> Result(
  List(#(String, String, String, Bool, Bool)),
  List(decode.DecodeError),
) {
  decode.run(
    children,
    decode.list({
      use child <- decode.then(decode.dynamic)
      use tag_name <- decode.field("tagName", decode.string)
      use text_content <- decode.field("textContent", decode.string)
      use value <- decode.then(case get_attribute(child, "value") {
        Ok(value) -> value |> decode.success
        Error(Nil) -> "" |> decode.failure("String")
      })
      let selected = case get_attribute(child, "selected") {
        Ok(_) -> True
        Error(Nil) -> False
      }
      let has_content = case get_attribute(child, has_content_attribute) {
        Ok(_) -> True
        Error(Nil) -> False
      }
      decode.success(#(
        tag_name
          |> string.lowercase,
        value,
        text_content,
        has_content,
        selected,
      ))
    }),
  )
}

fn handle_slot_change() -> decode.Decoder(Msg) {
  use slot <- decode.field("target", decode.dynamic)
  use children <- decode.then(case assigned_elements(slot) {
    Ok(children) -> children |> decode.success
    Error(Nil) -> dynamic.nil() |> decode.failure("Dynamic")
  })
  use options <- decode.then(case options(children) {
    Ok(options) -> options |> decode.success
    Error(_) -> [] |> decode.failure("List(#(String, String, String, Bool))")
  })

  options
  |> list.fold_right(#([], option.None, set.new()), fn(acc, option) {
    let #(tag, value, label, has_content, selected) = option

    use <- bool.guard(tag != option_name, acc)
    use <- bool.guard(set.contains(acc.2, value), acc)
    let seen = set.insert(acc.2, value)
    let options = [Option(value:, label:, has_content:), ..acc.0]
    let selection = case selected, acc.1 {
      True, option.None -> option.Some(value)
      _, _ -> acc.1
    }

    #(options, selection, seen)
  })
  |> fn(tuple) {
    let #(options, selection, _seen) = tuple
    ParentChangedChildren(options, selection)
  }
  |> decode.success
}

@external(javascript, "../../dom.ffi.mjs", "assigned_elements")
fn assigned_elements(slot: Dynamic) -> Result(Dynamic, Nil)

@external(javascript, "../../dom.ffi.mjs", "get_attribute")
fn get_attribute(element: Dynamic, name: String) -> Result(String, Nil)

// VIEW INPUT ------------------------------------------------------------------

fn view_input(query: String) -> Element(Msg) {
  input.container([attribute("part", "combobox-input")], [
    icon.magnifying_glass([]),
    input([
      attribute.autofocus(True),
      attribute.styles([
        #("width", "100%"),
        #("border-bottom-left-radius", "0px"),
        #("border-bottom-right-radius", "0px"),
      ]),
      attribute.name("query"),
      attribute.autocomplete("off"),
      event.on_input(UserChangedQuery),
      event.on_keydown(UserPressedKey),
      attribute.value(query),
    ]),
  ])
}

// VIEW OPTIONS ----------------------------------------------------------------

fn view_options(
  options: List(Option),
  value: option.Option(String),
  intent: option.Option(String),
) -> Element(Msg) {
  keyed.ul([], do_view_options(options, value, intent))
}

fn do_view_options(
  options: List(Option),
  value: option.Option(String),
  intent: option.Option(String),
) -> List(#(String, Element(Msg))) {
  case options {
    [] -> []
    [option] -> [#(option.value, view_option(option, value, intent, True))]
    [option, ..rest] -> [
      #(option.value, view_option(option, value, intent, False)),
      ..do_view_options(rest, value, intent)
    ]
  }
}

fn view_option(
  option: Option,
  value: option.Option(String),
  intent: option.Option(String),
  last: Bool,
) -> Element(Msg) {
  let is_selected = option.Some(option.value) == value
  let is_intent = option.Some(option.value) == intent

  let icon = case is_selected {
    True -> icon.check
    False -> html.span(_, [])
  }

  let parts = [
    "combobox-option",
    case is_intent {
      True -> "intent"
      False -> ""
    },
    case last {
      True -> "last"
      False -> ""
    },
  ]

  html.li(
    [
      attribute("part", string.join(parts, " ")),
      attribute("value", option.value),
      event.on_mouse_over(UserHoveredOption(option.value)),
      event.on_mouse_down(UserSelectedOption(option.value)),
    ],
    [
      icon([attribute.styles([#("height", "1rem"), #("width", "1rem")])]),
      html.span([attribute.style("flex", "1 1 0%")], [
        component.named_slot(content_key(option.value), [], []),
      ]),
    ],
  )
}
