import client/formy
import gleam/dynamic
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

pub type Model =
  pog.Connection

fn init(db) -> #(Model, Effect(Msg)) {
  #(db, effect.none())
}

// UPDATE ----------------------------------------------------------------------

pub opaque type Msg {
  UserClickedSave(dynamic.Dynamic)
}

fn update(model: Model, msg: Msg) -> #(Model, Effect(Msg)) {
  case msg {
    UserClickedSave(data) -> {
      echo data
      #(model, effect.none())
    }
  }
}

// VIEW ------------------------------------------------------------------------

fn view(_model: Model) -> Element(Msg) {
  html.div([], [formy.element([formy.on_change(UserClickedSave)])])
}
