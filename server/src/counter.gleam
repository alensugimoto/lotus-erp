import client/formy
import gleam/list
import lustre.{type App}
import lustre/component
import lustre/effect.{type Effect}
import lustre/element.{type Element}
import lustre/element/html
import pog
import sql

// MAIN ------------------------------------------------------------------------

pub fn component() -> App(pog.Connection, Model, Msg) {
  lustre.component(init, update, view, [component.open_shadow_root(True)])
}

// MODEL -----------------------------------------------------------------------

pub type Model {
  Model(db: pog.Connection)
}

fn init(db) -> #(Model, Effect(Msg)) {
  #(Model(db:), effect.none())
}

// UPDATE ----------------------------------------------------------------------

pub opaque type Msg {
  UserClickedSave(formy.Form)
}

fn update(model: Model, msg: Msg) -> #(Model, Effect(Msg)) {
  case msg {
    UserClickedSave(form) -> {
      let inserted_by = 1
      let formy.Form(date:, customer_id:, line_items:) = form
      let #(item_ids, quantities) =
        line_items
        |> list.map(fn(line_item) {
          let formy.LineItem(item_id:, quantity:) = line_item
          #(item_id, quantity)
        })
        |> list.unzip

      sql.insert_quote(model.db, date, customer_id, item_ids, quantities)
      #(model, effect.none())
    }
  }
}

// VIEW ------------------------------------------------------------------------

fn view(_model: Model) -> Element(Msg) {
  html.div([], [formy.element([formy.on_change(UserClickedSave)])])
}
