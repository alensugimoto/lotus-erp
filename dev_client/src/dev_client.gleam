import gleam/list
import gleam/string

pub const path_segments = ["dev"]

pub fn main() -> Nil {
  path_segments
  |> list.prepend("")
  |> string.join("/")
  |> connect
}

@external(javascript, "./dev_client.ffi.mjs", "connect")
fn connect(ws_endpoint: String) -> Nil
