// IMPORTS ------------------------------------------------------------------------

import gleam/dynamic/decode
import gleam/json
import gleam/list
import gleam/string
import lustre/attribute.{type Attribute}
import lustre/effect.{type Effect}
import lustre/element.{type Element}
import lustre/event
import lustre/server_component

// MAIN ------------------------------------------------------------------------

const change_event = "change"

const detail_key = "detail"

const value_key = "value"

pub const path_segments = ["ws", "combobox"]

pub fn element(
  attributes: List(Attribute(msg)),
  children: List(Element(msg)),
) -> Element(msg) {
  server_component.element(
    [
      path_segments
        |> list.prepend("")
        |> string.join("/")
        |> server_component.route,
      ..attributes
    ],
    children,
  )
}

pub fn on_change(handler: fn(Int) -> msg) -> Attribute(msg) {
  let key = [detail_key, value_key]
  event.on(change_event, {
    decode.at(key, decode.int)
    |> decode.map(handler)
  })
  |> server_component.include([
    key
    |> string.join("."),
  ])
}

pub fn emit_change(value: Int) -> Effect(msg) {
  change_event
  |> event.emit(json.object([#(value_key, json.int(value))]))
}
