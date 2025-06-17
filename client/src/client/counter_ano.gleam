import gleam/list
import gleam/string
import lustre/attribute.{type Attribute}
import lustre/element.{type Element}
import lustre/server_component

// MAIN ------------------------------------------------------------------------

pub const path_segments = ["ws", "counter"]

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
