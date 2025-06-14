// IMPORTS ---------------------------------------------------------------------

import { List, Ok, Error } from "./gleam.mjs";

// QUERIES ---------------------------------------------------------------------

export const assigned_elements = (slot) => {
  if (slot instanceof HTMLSlotElement) {
    return new Ok(List.fromArray(slot.assignedElements()));
  }
  return new Error(null);
};

export const get_attribute = (element, name) => {
  if (!(element instanceof HTMLElement)) {
    return new Error(null);
  }
  const attr = element.getAttribute(name);
  if (attr === null) {
    return new Error(null);
  }
  return new Ok(attr);
};

// EFFECTS ---------------------------------------------------------------------

/**
 * @param {HTMLElement} element
 */
export const focus = (element) => {
  element.focus();
};

export const set_state = (value, shadow_root) => {
  if (!(shadow_root instanceof ShadowRoot)) return;
  if (!(shadow_root.host.internals instanceof ElementInternals)) return;

  shadow_root.host.internals.states.add(value);
};

export const remove_state = (value, shadow_root) => {
  if (!(shadow_root instanceof ShadowRoot)) return;
  if (!(shadow_root.host.internals instanceof ElementInternals)) return;

  shadow_root.host.internals.states.delete(value);
};
