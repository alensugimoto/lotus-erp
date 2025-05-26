import client
import gleam/bytes_tree
import gleam/http/response.{type Response}
import gleam/uri.{type Uri}
import lustre/attribute
import lustre/element
import lustre/element/html
import mist.{type ResponseData}

pub fn serve_html(uri: Uri) -> Response(ResponseData) {
  let html =
    html.html([attribute.lang("en")], [
      html.head([], [
        html.meta([attribute.charset("utf-8")]),
        html.meta([
          attribute.name("viewport"),
          attribute.content("width=device-width, initial-scale=1"),
        ]),
        html.title([], "hello"),
        html.script(
          [attribute.type_("module"), attribute.src("/static/client.mjs")],
          "",
        ),
        html.script(
          // When serving the client runtime for server components, you must
          // remember to set the `type` attribute to `"module"` otherwise it won't
          // work!
          [attribute.type_("module"), attribute.src("/lustre/runtime.mjs")],
          "",
        ),
      ]),
      html.body([], [
        html.div([attribute.id("app")], [client.view_from_uri(uri)]),
      ]),
    ])
    |> element.to_document_string_tree
    |> bytes_tree.from_string_tree

  response.new(200)
  |> response.set_body(mist.Bytes(html))
  |> response.set_header("content-type", "text/html")
}
