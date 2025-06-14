// IMPORTS ---------------------------------------------------------------------

import gleam/bool
import gleam/dynamic/decode.{type Dynamic}
import gleam/json
import gleam/list
import gleam/string
import lustre
import lustre/attribute.{type Attribute, attribute}
import lustre/component
import lustre/effect.{type Effect}
import lustre/element.{type Element, element}
import lustre/element/html
import lustre/event

// TYPES -----------------------------------------------------------------------

pub type Anchor {
  TopLeft
  TopMiddle
  TopRight
  RightTop
  RightMiddle
  RightBottom
  BottomLeft
  BottomMiddle
  BottomRight
  LeftTop
  LeftMiddle
  LeftBottom
}

// ELEMENTS --------------------------------------------------------------------

pub const name: String = "lustre-ui-popover"

pub fn register() -> Result(Nil, lustre.Error) {
  let app =
    lustre.component(init, update, view, [
      component.open_shadow_root(True),
      on_attribute_change(),
    ])

  lustre.register(app, name)
}

pub fn popover(
  attributes: List(Attribute(msg)),
  trigger trigger: Element(msg),
  content content: Element(msg),
) -> Element(msg) {
  element(name, attributes, [
    html.div([component.slot("trigger")], [trigger]),
    html.div([component.slot("popover")], [content]),
  ])
}

// ATTRIBUTES ------------------------------------------------------------------

/// The `popover` primitive is a "controlled" component. That means it doesn't
/// manage its own state but instead relies on a parent component to manage the
/// open/closed state.
///
pub fn open(is_open: Bool) -> Attribute(msg) {
  attribute("aria-expanded", bool.to_string(is_open) |> string.lowercase)
}

///
///
pub fn anchor(direction: Anchor) -> Attribute(msg) {
  attribute("anchor", case direction {
    TopLeft -> "top-left"
    TopMiddle -> "top-middle"
    TopRight -> "top-right"
    RightTop -> "right-top"
    RightMiddle -> "right-middle"
    RightBottom -> "right-bottom"
    BottomLeft -> "bottom-left"
    BottomMiddle -> "bottom-middle"
    BottomRight -> "bottom-right"
    LeftTop -> "left-top"
    LeftMiddle -> "left-middle"
    LeftBottom -> "left-bottom"
  })
}

/// By default, the popover's content is sized intrinsically. This means the content
/// can be smaller or larger than the trigger element based on what's inside it.
///
/// Setting the `equal_width` attribute will make the popover's content match the
/// width of the trigger element. This is useful for elements like comboboxes and
/// selects where the user typically expects the popover to be the same width as
/// the trigger.
///
pub fn equal_width() -> Attribute(msg) {
  attribute("equal-width", "")
}

// STYLES ----------------------------------------------------------------------

/// By default, the `popover` primitive has a small gap between the trigger and
/// the popover content based on your theme configuration. You can use this function
/// to override that gap, or remove it entirely.
///
pub fn gap(value: String) -> Attribute(msg) {
  attribute.style("--gap", value)
}

// EVENTS ----------------------------------------------------------------------

pub fn on_change(handler: fn(Bool) -> msg) -> Attribute(msg) {
  event.on("change", {
    decode.at(["detail", "open"], decode.bool)
    |> decode.map(handler)
  })
}

pub fn on_open(handler: msg) -> Attribute(msg) {
  event.on("open", decode.success(handler))
}

pub fn on_close(handler: msg) -> Attribute(msg) {
  event.on("close", decode.success(handler))
}

// MODEL -----------------------------------------------------------------------

type Model {
  WillExpand
  Expanded
  WillCollapse
  Collapsing
  Collapsed
}

fn init(_) -> #(Model, Effect(Msg)) {
  let model = Collapsed
  let effect = effect.batch([set_state("collapsed")])

  #(model, effect)
}

// UPDATE ----------------------------------------------------------------------

type Msg {

  ParentSetOpen(Bool)
  SchedulerDidTick
  TransitionDidEnd
  UserPressedTrigger
}

fn update(model: Model, msg: Msg) -> #(Model, Effect(Msg)) {
  case msg, model {
    ParentSetOpen(True), WillCollapse | ParentSetOpen(True), Collapsed -> #(
      WillExpand,
      effect.batch([tick(), set_state("will-expand")]),
    )
    ParentSetOpen(True), _ -> #(model, effect.none())
    ParentSetOpen(False), WillExpand | ParentSetOpen(False), Expanded -> #(
      WillCollapse,
      effect.batch([tick(), set_state("will-collapse")]),
    )
    ParentSetOpen(False), _ -> #(model, effect.none())
    SchedulerDidTick, WillExpand -> #(Expanded, set_state("expanded"))
    SchedulerDidTick, WillCollapse -> #(Collapsing, set_state("collapsing"))
    SchedulerDidTick, _ -> #(model, effect.none())
    TransitionDidEnd, Collapsing -> #(Collapsed, set_state("collapsed"))
    TransitionDidEnd, _ -> #(model, effect.none())
    UserPressedTrigger, WillExpand | UserPressedTrigger, Expanded -> #(
      WillCollapse,
      effect.batch([
        set_state("will-collapse"),
        event.emit("close", json.null()),
        event.emit("change", json.object([#("open", json.bool(False))])),
      ]),
    )
    UserPressedTrigger, WillCollapse
    | UserPressedTrigger, Collapsing
    | UserPressedTrigger, Collapsed
    -> #(
      WillExpand,
      effect.batch([
        set_state("will-expand"),
        event.emit("open", json.null()),
        event.emit("change", json.object([#("open", json.bool(True))])),
      ]),
    )
  }
}

fn on_attribute_change() -> component.Option(Msg) {
  component.on_attribute_change("aria-expanded", fn(value) {
    case value {
      "true" -> True
      _ -> False
    }
    |> ParentSetOpen
    |> Ok
  })
}

// EFFECTS ---------------------------------------------------------------------

fn set_state(value: String) -> Effect(msg) {
  use _dispatch, root <- effect.before_paint

  use state <- list.each([
    "will-expand", "expanded", "will-collapse", "collapsing", "collapsed",
  ])

  case state == value {
    True -> do_set_state(value, root)
    False -> do_remove_state(state, root)
  }
}

@external(javascript, "../../../dom.ffi.mjs", "set_state")
fn do_set_state(value: String, root: Dynamic) -> Nil

@external(javascript, "../../../dom.ffi.mjs", "remove_state")
fn do_remove_state(value: String, root: Dynamic) -> Nil

fn tick() -> Effect(Msg) {
  use dispatch, _root <- effect.after_paint
  dispatch(SchedulerDidTick)
}

// VIEW ------------------------------------------------------------------------

fn view(model: Model) -> Element(Msg) {
  html.div([attribute.style("position", "relative")], [
    view_trigger(),
    view_popover(model),
  ])
}

fn view_trigger() -> Element(Msg) {
  component.named_slot(
    "trigger",
    [
      event.on_click(UserPressedTrigger),
      event.on("keydown", {
        use key <- decode.field("key", decode.string)

        case key {
          "Enter" | " " -> decode.success(UserPressedTrigger)
          _ -> decode.failure(UserPressedTrigger, "Msg")
        }
      }),
    ],
    [],
  )
}

fn view_popover(model: Model) -> Element(Msg) {
  use <- bool.guard(model == Collapsed, element.none())

  html.div(
    [
      attribute("part", "popover-content"),
      event.on("transitionend", TransitionDidEnd |> decode.success),
    ],
    [component.named_slot("popover", [], [])],
  )
}
