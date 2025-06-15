// IMPORTS ---------------------------------------------------------------------

import client/ui/input.{input}
import client/ui/primitives/icon
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
  let app =
    lustre.component(init, update, view, [
      component.open_shadow_root(True),
      component.on_property_change(
        "values",
        decode.list(decode.string)
          |> decode.map(ParentChangedValues),
      ),
    ])
  lustre.register(app, name)
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
    value: String,
    query: String,
    intent: option.Option(String),
    values: List(String),
  )
}

fn init(_) -> #(Model, Effect(Msg)) {
  #(Model(value: "", query: "", intent: option.None, values: []), effect.none())
}

// UPDATE ----------------------------------------------------------------------

type Msg {
  ParentChangedValues(List(String))
  UserChangedQuery(String)
  UserHoveredOption(String)
  UserPressedKey(String)
  UserSelectedOption(String)
}

fn update(model: Model, msg: Msg) -> #(Model, Effect(Msg)) {
  case msg {
    ParentChangedValues(values) -> {
      let intent =
        values
        |> list.first
        |> option.from_result
      let model = Model(..model, values:, intent:)
      let effect = effect.none()

      #(model, effect)
    }

    UserChangedQuery(query) -> {
      let effect =
        event.emit("query", json.object([#("query", json.string(query))]))
      let model = Model(..model, query:)

      #(model, effect)
    }

    UserPressedKey("Tab") -> {
      let effect = {
        use _dispatch, root <- effect.after_paint
        hide_popover(root)
      }

      #(model, effect)
    }

    UserHoveredOption(intent) -> #(
      Model(..model, intent: option.Some(intent)),
      effect.none(),
    )

    UserPressedKey("ArrowDown") -> {
      let intent = case model.intent {
        option.Some(intent) ->
          model.values
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
          model.values
          |> list.first
          |> option.from_result
      }

      let model = Model(..model, intent:)
      let effect = effect.none()

      #(model, effect)
    }

    UserPressedKey("End") -> {
      let intent =
        model.values
        |> list.last
        |> option.from_result
      let model = Model(..model, intent:)
      let effect = effect.none()

      #(model, effect)
    }

    UserPressedKey("Enter") -> {
      let model =
        Model(
          ..model,
          value: model.intent
            |> option.unwrap(model.value),
        )
      let effect = case model.intent {
        option.Some(value) ->
          effect.batch([
            event.emit("change", json.object([#("value", json.string(value))])),
            {
              use _dispatch, root <- effect.after_paint
              hide_popover(root)
            },
          ])
        option.None -> {
          use _dispatch, root <- effect.after_paint
          hide_popover(root)
        }
      }

      #(model, effect)
    }

    UserPressedKey("Escape") -> {
      let effect = {
        use _dispatch, root <- effect.after_paint
        hide_popover(root)
      }

      #(model, effect)
    }

    UserPressedKey("Home") -> {
      let intent =
        model.values
        |> list.first
        |> option.from_result
      let model = Model(..model, intent:)
      let effect = effect.none()

      #(model, effect)
    }

    UserPressedKey("ArrowUp") -> {
      let intent = case model.intent {
        option.Some(intent) ->
          model.values
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
          model.values
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
      let model = Model(..model, value:)
      let effect =
        effect.batch([
          event.emit("change", json.object([#("value", json.string(value))])),
          {
            use _dispatch, root <- effect.after_paint
            hide_popover(root)
          },
        ])

      #(model, effect)
    }
  }
}

@external(javascript, "../../dom.ffi.mjs", "hide_popover")
fn hide_popover(root: Dynamic) -> Nil

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
    html.button([attribute.popovertarget("mypopover")], [
      html.span([attribute("part", "combobox-trigger-label")], [
        component.named_slot(model.value, [], []),
      ]),
      icon.chevron_down([attribute("part", "combobox-trigger-icon")]),
    ]),
    html.div([attribute.id("mypopover"), attribute.popover("")], [
      view_input(model.query),
      view_options(model.values, model.value, model.intent),
    ]),
  ])
}

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
