// import envoy
import counter
import gleam/bytes_tree
import gleam/erlang
import gleam/erlang/process.{type Selector, type Subject}
import gleam/function
import gleam/http/request.{type Request}
import gleam/http/response.{type Response}
import gleam/json
import gleam/option.{type Option, None, Some}
import gleam/otp/actor
import logging
import lustre
import lustre/server_component
import mist.{type Connection, type ResponseData}

// import pog
import server/web

pub fn main() {
  logging.configure()

  // let _db = start_database_pool()

  let assert Ok(_) =
    fn(request: Request(Connection)) -> Response(ResponseData) {
      // TODO: remove trailing slashes and redirect 301
      case request.path_segments(request) {
        ["static", "client.mjs"] -> serve_runtime()
        ["lustre", "runtime.mjs"] -> serve_lustre_runtime()
        ["ws"] -> serve_counter(request)

        _ ->
          request
          |> request.to_uri()
          |> web.serve_html()
      }
    }
    |> mist.new()
    |> mist.port(3000)
    |> mist.start_http()

  process.sleep_forever()
}

// fn start_database_pool() -> pog.Connection {
//   let assert Ok(url) = envoy.get("DATABASE_URL")
//   let assert Ok(config) = pog.url_config(url)
//
//   config
//   |> pog.pool_size(15)
//   |> pog.connect()
// }

// HTML ------------------------------------------------------------------------

// JAVASCRIPT ------------------------------------------------------------------

fn serve_lustre_runtime() -> Response(ResponseData) {
  // Whenever you want to use server components, it's important that you serve
  // the client runtime to the browser. This small JavaScript module registers
  // the `<lustre-server-component />` custom element that you'll use in your HTML
  // to create server components.
  //
  // Lustre includes both a standard and a minified version of the runtime. The
  // minified bundle clocks in at just 10kB before compression!
  let assert Ok(lustre_priv) = erlang.priv_directory("lustre")
  let file_path = lustre_priv <> "/static/lustre-server-component.min.mjs"

  case mist.send_file(file_path, offset: 0, limit: None) {
    Ok(file) ->
      response.new(200)
      |> response.prepend_header("content-type", "application/javascript")
      |> response.set_body(file)

    Error(_) ->
      response.new(404)
      |> response.set_body(mist.Bytes(bytes_tree.new()))
  }
}

fn serve_runtime() -> Response(ResponseData) {
  let assert Ok(client_priv) = erlang.priv_directory("client")
  let file_path = client_priv <> "/static/client.mjs"

  case mist.send_file(file_path, offset: 0, limit: None) {
    Ok(file) ->
      response.new(200)
      |> response.prepend_header("content-type", "application/javascript")
      |> response.set_body(file)

    Error(_) ->
      response.new(404)
      |> response.set_body(mist.Bytes(bytes_tree.new()))
  }
}

// WEBSOCKET -------------------------------------------------------------------

fn serve_counter(request: Request(Connection)) -> Response(ResponseData) {
  mist.websocket(
    request:,
    on_init: init_counter_socket,
    handler: loop_counter_socket,
    on_close: close_counter_socket,
  )
}

type CounterSocket {
  CounterSocket(
    component: lustre.Runtime(counter.Msg),
    self: Subject(server_component.ClientMessage(counter.Msg)),
  )
}

type CounterSocketMessage =
  server_component.ClientMessage(counter.Msg)

type CounterSocketInit =
  #(CounterSocket, Option(Selector(CounterSocketMessage)))

fn init_counter_socket(_) -> CounterSocketInit {
  let counter = counter.component()
  // Rather than calling `lustre.start` as we do in the client, we construct the
  // Lustre runtime by calling `lustre.start_server_component`. This is the same
  // `Runtime` type we get from `lustre.start` but this function doesn't need a
  // CSS selector for the element to attach to: there's no DOM here!
  let assert Ok(component) = lustre.start_server_component(counter, Nil)

  // The server component runtime communicates to the websocket process using
  // Gleam's standard process messaging. We construct a new subject that the
  // runtime can send messages to, and then we initialise a selector so that we
  // can handle those messages in `loop_counter_socket`.
  let self = process.new_subject()
  let selector =
    process.new_selector()
    |> process.selecting(self, function.identity)

  // Calling `register_subject` is how the runtime knows to send messages to
  // this process when it wants to communicate with the client. In Lustre, server
  // components are not opinionated about the transport layer or your network
  // setup: instead the runtime broadcasts messages to any registered subjects
  // and lets you handle the transport layer yourself.
  server_component.register_subject(self)
  |> lustre.send(to: component)

  #(CounterSocket(component:, self:), Some(selector))
}

fn loop_counter_socket(
  state: CounterSocket,
  connection: mist.WebsocketConnection,
  message: mist.WebsocketMessage(CounterSocketMessage),
) {
  case message {
    // The client runtime will send us JSON-encoded text frames that we need to
    // decode and pass to the server component runtime.
    mist.Text(json) -> {
      case json.parse(json, server_component.runtime_message_decoder()) {
        Ok(runtime_message) -> lustre.send(state.component, runtime_message)
        // This case will only be hit if something other than Lustre's client
        // runtime sends us a message.
        Error(_) -> Nil
      }

      actor.continue(state)
    }

    mist.Binary(_) -> {
      actor.continue(state)
    }

    // We hit this case when the server component runtime sends us a message that
    // we need to forward to the client. Because Lustre does not control your
    // network connection, it's our app's responsibility to make sure these messages
    // are encoded and sent to the client.
    mist.Custom(client_message) -> {
      let json = server_component.client_message_to_json(client_message)
      let assert Ok(_) = mist.send_text_frame(connection, json.to_string(json))

      actor.continue(state)
    }

    mist.Closed | mist.Shutdown -> {
      // The server component runtime sets up a process monitor that can clean
      // up if our socket process dies or is killed, but it's good practice to
      // clean up ourselves if we get the opportunity.
      server_component.deregister_subject(state.self)
      |> lustre.send(to: state.component)

      actor.Stop(process.Normal)
    }
  }
}

fn close_counter_socket(state: CounterSocket) -> Nil {
  server_component.deregister_subject(state.self)
  |> lustre.send(to: state.component)
}
