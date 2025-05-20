// import envoy
import gleam/bytes_tree
import gleam/erlang
import gleam/erlang/process
import gleam/http/request.{type Request}
import gleam/http/response.{type Response}
import gleam/option.{None}
import logging
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
