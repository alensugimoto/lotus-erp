import client/formy
import gleam/json
import gleam/option
import lustre.{type App}
import lustre/component
import lustre/effect.{type Effect}
import lustre/element.{type Element}
import lustre/element/html
import pog

// MAIN ------------------------------------------------------------------------

pub fn component() -> App(pog.Connection, Model, Msg) {
  lustre.component(init, update, view, [component.open_shadow_root(True)])
}

// MODEL -----------------------------------------------------------------------

pub type Model {
  Model(db: pog.Connection, msg: option.Option(String))
}

fn init(db) -> #(Model, Effect(Msg)) {
  #(Model(db:, msg: option.None), effect.none())
}

// UPDATE ----------------------------------------------------------------------

pub opaque type Msg {
  UserClickedSave(Result(json.Json, Nil))
}

fn update(model: Model, msg: Msg) -> #(Model, Effect(Msg)) {
  case msg {
    UserClickedSave(data) -> {
      #(
        Model(..model, msg: case data {
          Ok(json) -> option.Some("Ok: " <> json.to_string(json))
          Error(Nil) -> option.Some("Error")
        }),
        effect.none(),
      )
    }
  }
}

// VIEW ------------------------------------------------------------------------

fn view(model: Model) -> Element(Msg) {
  html.div([], [
    formy.element([formy.on_change(UserClickedSave)]),
    case model.msg {
      option.None -> element.none()
      option.Some(msg) -> html.text(msg)
    },
  ])
}
