// IMPORTS ---------------------------------------------------------------------

import client/ui/input.{input}
import client/ui/primitives/icon
import client/ui/primitives/popover.{popover}
import gleam/dynamic/decode.{type Dynamic}
import gleam/json
import gleam/list
import gleam/option
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

//
// // TYPES -----------------------------------------------------------------------
//
// pub opaque type Item {
//   Item(value: String, label: String)
// }

// ELEMENTS --------------------------------------------------------------------

pub const name: String = "lustre-ui-combobox"

pub fn register() -> Result(Nil, lustre.Error) {
  case popover.register() {
    Ok(Nil) | Error(lustre.ComponentAlreadyRegistered(_)) -> {
      let app =
        lustre.component(init, update, view, [
          component.open_shadow_root(True),
          component.on_property_change("values", {
            decode.list(decode.string)
            |> decode.map(ParentChangedValues)
          }),
        ])
      lustre.register(app, name)
    }
    error -> error
  }
}

pub fn element(
  attributes: List(Attribute(msg)),
  children: List(#(String, List(Element(msg)))),
) -> Element(msg) {
  keyed.element(
    name,
    [
      attribute.property(
        "values",
        children
          |> list.map(fn(child) { child.0 })
          |> json.array(json.string),
      ),
      ..attributes
    ],
    {
      use #(value, el) <- list.map(children)
      let el = html.div([component.slot(value)], el)
      #(value, el)
    },
  )
}

// EVENTS ----------------------------------------------------------------------

const detail = "detail"

pub fn on_query(handler: fn(String) -> msg) -> Attribute(msg) {
  let value = [detail, "query"]
  event.on("query", {
    decode.at(value, decode.string)
    |> decode.map(handler)
  })
  |> server_component.include([value |> string.join(".")])
}

pub fn on_change(handler: fn(String) -> msg) -> Attribute(msg) {
  let value = [detail, "value"]
  event.on("change", {
    decode.at(value, decode.string)
    |> decode.map(handler)
  })
  |> server_component.include([value |> string.join(".")])
}

// MODEL -----------------------------------------------------------------------

type Model {
  Model(
    expanded: Bool,
    value: String,
    query: String,
    intent: option.Option(String),
    options: List(String),
  )
}

fn init(_) -> #(Model, Effect(Msg)) {
  let model =
    Model(
      expanded: False,
      value: "",
      query: "",
      intent: option.None,
      options: [],
    )
  let effect = effect.batch([set_state("empty")])

  #(model, effect)
}

// UPDATE ----------------------------------------------------------------------

type Msg {
  DomBlurredTrigger
  DomFocusedTrigger
  ParentChangedValues(List(String))
  UserChangedQuery(String)
  UserClosedMenu
  UserHoveredOption(String)
  UserOpenedMenu
  UserPressedKey(String)
  UserSelectedOption(String)
}

fn update(model: Model, msg: Msg) -> #(Model, Effect(Msg)) {
  case msg {
    DomBlurredTrigger -> #(model, remove_state("trigger-focus"))

    DomFocusedTrigger -> #(model, set_state("trigger-focus"))

    ParentChangedValues(options) -> {
      let intent = option.None
      let model = Model(..model, options:, intent:)
      let effect = effect.none()

      #(model, effect)
    }

    UserChangedQuery(query) -> {
      let effect =
        event.emit("query", json.object([#("query", json.string(query))]))
      let model = Model(..model, query:)

      #(model, effect)
    }

    UserClosedMenu | UserPressedKey("Tab") -> {
      let model = Model(..model, expanded: False, intent: option.None)
      let effect = remove_state("expanded")

      #(model, effect)
    }

    UserHoveredOption(intent) -> #(
      Model(..model, intent: option.Some(intent)),
      effect.none(),
    )

    UserOpenedMenu -> {
      let model = Model(..model, expanded: True)
      let effect = set_state("expanded")

      #(model, effect)
    }

    UserPressedKey("ArrowDown") -> {
      let intent = case model.intent {
        option.Some(intent) ->
          model.options
          |> list.fold_until(option.None, fn(acc, item) {
            case acc {
              option.Some(_) -> item |> option.Some |> list.Stop
              option.None ->
                case item == intent {
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
      }

      let model = Model(..model, intent:)
      let effect = effect.none()

      #(model, effect)
    }

    UserPressedKey("ArrowEnd") -> {
      let intent =
        model.options
        |> list.last
        |> option.from_result
      let model = Model(..model, intent:)
      let effect = effect.none()

      #(model, effect)
    }

    UserPressedKey("Enter") -> {
      let effect = case model.intent {
        option.Some(value) ->
          event.emit("change", json.object([#("value", json.string(value))]))
        option.None -> effect.none()
      }

      #(model, effect)
    }

    UserPressedKey("Escape") -> {
      let model = Model(..model, expanded: False, intent: option.None)
      let effect = remove_state("expanded")

      #(model, effect)
    }

    UserPressedKey("Home") -> {
      let intent =
        model.options
        |> list.first
        |> option.from_result
      let model = Model(..model, intent:)
      let effect = effect.none()

      #(model, effect)
    }

    UserPressedKey("ArrowUp") -> {
      let intent = case model.intent {
        option.Some(intent) ->
          model.options
          |> list.reverse
          |> list.fold_until(option.None, fn(acc, item) {
            case acc {
              option.Some(_) -> item |> option.Some |> list.Stop
              option.None ->
                case item == intent {
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
      }

      let model = Model(..model, intent:)
      let effect = effect.none()

      #(model, effect)
    }

    UserPressedKey(_key) -> {
      #(model, effect.none())
    }

    UserSelectedOption(value) -> {
      let intent =
        model.options
        |> list.find(fn(item) { item == value })
        |> option.from_result
      let model = Model(..model, intent:)
      let effect =
        event.emit("change", json.object([#("value", json.string(value))]))

      #(model, effect)
    }
  }
}

// EFFECTS ---------------------------------------------------------------------

fn set_state(value: String) -> Effect(msg) {
  use _dispatch, root <- effect.before_paint
  do_set_state(value, root)
}

@external(javascript, "../../dom.ffi.mjs", "set_state")
fn do_set_state(value: String, root: Dynamic) -> Nil

fn remove_state(value: String) -> Effect(msg) {
  use _dispatch, root <- effect.before_paint
  do_remove_state(value, root)
}

@external(javascript, "../../dom.ffi.mjs", "remove_state")
fn do_remove_state(value: String, root: Dynamic) -> Nil

// VIEW ------------------------------------------------------------------------

fn view(model: Model) -> Element(Msg) {
  element.fragment([
    popover(
      [
        popover.anchor(popover.BottomMiddle),
        popover.equal_width(),
        popover.gap("var(--padding-y)"),
        popover.on_close(UserClosedMenu),
        popover.on_open(UserOpenedMenu),
        popover.open(model.expanded),
      ],
      trigger: view_trigger(model.value),
      content: html.div([attribute("part", "combobox-options")], [
        view_input(model.query),
        view_options(model.options, model.value, model.intent),
      ]),
    ),
  ])
}

// fn options(
//   children: Dynamic,
// ) -> Result(List(#(String, String, String)), List(decode.DecodeError)) {
//   decode.run(
//     children,
//     decode.list({
//       use child <- decode.then(decode.dynamic)
//       use tag_name <- decode.field("tagName", decode.string)
//       use text_content <- decode.field("textContent", decode.string)
//       use value <- decode.then(case get_attribute(child, "slot") {
//         Ok(value) -> value |> decode.success
//         Error(_) -> "" |> decode.failure("String")
//       })
//       decode.success(#(tag_name, value, text_content))
//     }),
//   )
// }

// const option_name = "lustre-ui-combobox-option"

//
// fn handle_slot_change() -> Decoder(Msg) {
//   use slot <- decode.field("target", decode.dynamic)
//   use children <- decode.then(case assigned_elements(slot) {
//     Ok(children) -> children |> decode.success
//     Error(_) -> dynamic.nil() |> decode.failure("Dynamic")
//   })
//   echo children
//   use options <- decode.then(case options(children) {
//     Ok(options) -> options |> decode.success
//     Error(_) -> [] |> decode.failure("List(#(String, String, String))")
//   })
//   echo options
//
//   options
//   |> list.fold_right(#([], set.new()), fn(acc, option) {
//     let #(tag, value, label) = option
//
//     use <- bool.guard(set.contains(acc.1, value), acc)
//     let seen = set.insert(acc.1, value)
//     let options = [Item(value:, label:), ..acc.0]
//
//     #(options, seen)
//   })
//   |> pair.first
//   |> ParentChangedChildren
//   |> decode.success
// }
//
// @external(javascript, "../../dom.ffi.mjs", "assigned_elements")
// fn assigned_elements(slot: Dynamic) -> Result(Dynamic, Nil)
//
// @external(javascript, "../../dom.ffi.mjs", "get_attribute")
// fn get_attribute(element: Dynamic, name: String) -> Result(String, Nil)

// VIEW TRIGGER ----------------------------------------------------------------

fn view_trigger(value: String) -> Element(Msg) {
  html.button(
    [
      attribute("part", "combobox-trigger"),
      attribute("tabindex", "0"),
      event.on_focus(DomFocusedTrigger),
      event.on_blur(DomBlurredTrigger),
    ],
    [
      html.span([attribute("part", "combobox-trigger-label")], [
        component.named_slot(value, [], []),
      ]),
      icon.chevron_down([attribute("part", "combobox-trigger-icon")]),
    ],
  )
}

// VIEW INPUT ------------------------------------------------------------------

fn view_input(query: String) -> Element(Msg) {
  input.container([attribute("part", "combobox-input")], [
    icon.magnifying_glass([]),
    input([
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
  options: List(String),
  value: String,
  intent: option.Option(String),
) -> Element(Msg) {
  keyed.ul([], do_view_options(options, value, intent))
}

fn do_view_options(
  options: List(String),
  value: String,
  intent: option.Option(String),
) -> List(#(String, Element(Msg))) {
  case options {
    [] -> []
    [option] -> [#(option, view_option(option, value, intent, True))]
    [option, ..rest] -> [
      #(option, view_option(option, value, intent, False)),
      ..do_view_options(rest, value, intent)
    ]
  }
}

fn view_option(
  option: String,
  value: String,
  intent: option.Option(String),
  last: Bool,
) -> Element(Msg) {
  let is_selected = option == value
  let is_intent = option.Some(option) == intent

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
      attribute("value", option),
      event.on_mouse_over(UserHoveredOption(option)),
      event.on_mouse_down(UserSelectedOption(option)),
    ],
    [
      icon([attribute.styles([#("height", "1rem"), #("width", "1rem")])]),
      html.span([attribute.style("flex", "1 1 0%")], [
        component.named_slot(option, [], []),
      ]),
    ],
  )
}
