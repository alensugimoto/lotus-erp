import client
import client/counter_ano
import client/customer_combobox
import components/combobox
import components/counter
import envoy
import gleam/bytes_tree
import gleam/dict
import gleam/erlang
import gleam/erlang/process.{type Subject}
import gleam/function
import gleam/http.{Get}
import gleam/http/request.{type Request}
import gleam/http/response.{type Response, Response}
import gleam/int
import gleam/json
import gleam/list
import gleam/option.{None, Some}
import gleam/otp/actor
import gleam/pair
import gleam/result
import gleam/string
import gleam/uri.{type Uri}
import logging
import lustre
import lustre/attribute
import lustre/element
import lustre/element/html
import lustre/server_component
import mist.{type Connection as HttpConnection, type ResponseData, Websocket}
import pog.{type Connection as DbConnectionPool}

fn start_database_pool() -> pog.Connection {
  let assert Ok(user) = envoy.get("PGUSER")
  let assert Ok(database) = envoy.get("PGDATABASE")
  let assert Ok(host) = envoy.get("PGHOST")
  let assert Ok(port) = envoy.get("PGPORT")
  let assert Ok(port) = int.parse(port)

  pog.default_config()
  |> pog.host(host)
  |> pog.port(port)
  |> pog.user(user)
  |> pog.database(database)
  |> pog.pool_size(15)
  |> pog.connect()
}

type Context {
  Context(db: DbConnectionPool, resources: dict.Dict(List(String), Resource))
}

type Resource {
  Dev
  Asset(priv: String, src: String, doc_type: DocumentType)
  CounterComponent
  Combobox
}

type DocumentType {
  JavaScriptModule
  CascadingStyleSheets
}

fn doc_type_to_ext(doc_type: DocumentType) -> String {
  case doc_type {
    JavaScriptModule -> ".mjs"
    CascadingStyleSheets -> ".css"
  }
}

fn get_resources() -> dict.Dict(List(String), Resource) {
  let assets =
    [
      // NOTE: dev mode
      #("autoreload", "server", JavaScriptModule),
      #("client", "client", JavaScriptModule),
      #("client", "client", CascadingStyleSheets),
      #("lustre-server-component.min", "lustre", JavaScriptModule),
    ]
    |> list.map(fn(asset) {
      let #(file_name, pkg_name, doc_type) = asset
      let assert Ok(priv) = erlang.priv_directory(pkg_name)
      let path_segs = ["static", file_name <> doc_type_to_ext(doc_type)]
      let src = string.join(["", ..path_segs], with: "/")
      #(path_segs, Asset(priv:, src:, doc_type:))
    })

  let websockets = [
    #(["ws"], Dev),
    #(counter_ano.path_segments, CounterComponent),
    #(customer_combobox.path_segments, Combobox),
  ]

  let resources = list.append(assets, websockets)
  let dict_resources = dict.from_list(resources)

  let assert True =
    list.length(dict.keys(dict_resources)) == list.length(resources)

  dict_resources
}

pub fn main() {
  logging.configure()

  let ctx = {
    let db = start_database_pool()
    let resources = get_resources()
    Context(db:, resources:)
  }

  let assert Ok(_) =
    handle_request(_, ctx)
    |> mist.new()
    |> mist.port(3000)
    |> mist.start_http()

  process.sleep_forever()
}

fn handle_request(
  req: Request(HttpConnection),
  ctx: Context,
) -> Response(ResponseData) {
  // TODO: remove trailing slashes and redirect 301
  case req.method {
    Get -> handle_get_request(req, ctx)
    _ ->
      response.new(405)
      |> response.set_body(mist.Bytes(bytes_tree.new()))
  }
}

fn handle_get_request(
  req: Request(HttpConnection),
  ctx: Context,
) -> Response(ResponseData) {
  ctx.resources
  |> dict.get(request.path_segments(req))
  |> result.then(fn(resource) {
    case resource {
      Asset(priv:, src:, doc_type:) -> serve_static_file(priv:, src:, doc_type:)
      Dev ->
        // NOTE: dev mode
        start_websocket(
          req:,
          handler: fn(_state, _conn, _msg) { actor.Stop(process.Normal) },
          on_init: fn(_conn) { #(Nil, None) },
          on_close: fn(_state) { Nil },
        )
      CounterComponent ->
        start_component(req:, app: counter.component, with: ctx.db)
      Combobox -> start_component(req:, app: combobox.component, with: ctx.db)
    }
  })
  |> result.lazy_unwrap(fn() {
    req
    |> request.to_uri()
    |> serve_html(ctx)
  })
}

fn serve_static_file(
  priv priv: String,
  src src: String,
  doc_type doc_type: DocumentType,
) -> Result(Response(ResponseData), Nil) {
  priv
  |> string.append(src)
  |> mist.send_file(offset: 0, limit: None)
  |> result.map_error(fn(_) { Nil })
  |> result.map(fn(file) {
    response.new(200)
    |> response.prepend_header("content-type", doc_type_to_mime_type(doc_type))
    |> response.set_body(file)
  })
}

fn doc_type_to_mime_type(doc_type: DocumentType) -> String {
  case doc_type {
    JavaScriptModule -> "text/javascript"
    CascadingStyleSheets -> "text/css"
  }
}

fn start_websocket(
  req request,
  handler handler,
  on_init on_init,
  on_close on_close,
) -> Result(Response(ResponseData), Nil) {
  mist.websocket(request:, handler:, on_init:, on_close:)
  |> require_websocket_response()
}

fn start_component(
  req req: Request(HttpConnection),
  app app: fn() -> lustre.App(start_args, model, msg),
  with start_args: start_args,
) -> Result(Response(ResponseData), Nil) {
  start_websocket(
    req:,
    handler: loop_component_socket,
    on_init: init_component_socket(_, app, start_args),
    on_close: close_component_socket,
  )
}

fn require_websocket_response(
  resp: Response(ResponseData),
) -> Result(Response(ResponseData), Nil) {
  case resp {
    Response(body: Websocket(_), ..) -> Ok(resp)
    Response(..) -> Error(Nil)
  }
}

type ComponentSocket(msg) {
  ComponentSocket(
    component: lustre.Runtime(msg),
    self: Subject(server_component.ClientMessage(msg)),
  )
}

type ComponentSocketMessage(msg) =
  server_component.ClientMessage(msg)

fn init_component_socket(
  _connection: mist.WebsocketConnection,
  app: fn() -> lustre.App(start_args, model, msg),
  start_args: start_args,
) {
  let assert Ok(component) =
    app()
    |> lustre.start_server_component(start_args)

  let self = process.new_subject()
  let selector =
    process.new_selector()
    |> process.selecting(self, function.identity)

  server_component.register_subject(self)
  |> lustre.send(to: component)

  #(ComponentSocket(component:, self:), Some(selector))
}

fn loop_component_socket(
  state: ComponentSocket(msg),
  connection: mist.WebsocketConnection,
  message: mist.WebsocketMessage(ComponentSocketMessage(msg)),
) {
  case message {
    mist.Text(json) -> {
      case json.parse(json, server_component.runtime_message_decoder()) {
        Ok(runtime_message) -> lustre.send(state.component, runtime_message)
        Error(_) -> Nil
      }

      actor.continue(state)
    }

    mist.Binary(_) -> {
      actor.continue(state)
    }

    mist.Custom(client_message) -> {
      let json = server_component.client_message_to_json(client_message)
      let assert Ok(Nil) =
        mist.send_text_frame(connection, json.to_string(json))

      actor.continue(state)
    }

    mist.Closed | mist.Shutdown -> actor.Stop(process.Normal)
  }
}

fn close_component_socket(state: ComponentSocket(msg)) -> Nil {
  server_component.deregister_subject(state.self)
  |> lustre.send(to: state.component)
}

fn serve_html(uri: Uri, ctx: Context) -> Response(ResponseData) {
  let html =
    html.html([attribute.lang("en")], [
      html.head([], [
        html.meta([attribute.charset("utf-8")]),
        html.meta([
          attribute.name("viewport"),
          attribute.content("width=device-width, initial-scale=1"),
        ]),
        html.title([], "hello"),
        element.fragment(
          ctx.resources
          |> dict.values()
          |> list.map(fn(resource) {
            case resource {
              Asset(src:, doc_type: JavaScriptModule, ..) ->
                html.script([attribute.type_("module"), attribute.src(src)], "")
              Asset(src:, doc_type: CascadingStyleSheets, ..) ->
                html.link([attribute.rel("stylesheet"), attribute.href(src)])
              _ -> element.none()
            }
          }),
        ),
      ]),
      html.body([], [
        html.div([attribute.id("app")], [client.view_from_uri(uri)]),
      ]),
    ])
    |> element.to_document_string_tree()
    |> bytes_tree.from_string_tree()

  response.new(200)
  |> response.set_body(mist.Bytes(html))
  |> response.set_header("content-type", "text/html")
}
