// build/dev/javascript/prelude.mjs
var List = class {
  static fromArray(array, tail) {
    let t = tail || new Empty();
    for (let i = array.length - 1; i >= 0; --i) {
      t = new NonEmpty(array[i], t);
    }
    return t;
  }
  [Symbol.iterator]() {
    return new ListIterator(this);
  }
  toArray() {
    return [...this];
  }
  // @internal
  atLeastLength(desired) {
    let current = this;
    while (desired-- > 0 && current) current = current.tail;
    return current !== void 0;
  }
  // @internal
  hasLength(desired) {
    let current = this;
    while (desired-- > 0 && current) current = current.tail;
    return desired === -1 && current instanceof Empty;
  }
  // @internal
  countLength() {
    let current = this;
    let length2 = 0;
    while (current) {
      current = current.tail;
      length2++;
    }
    return length2 - 1;
  }
};
function prepend(element, tail) {
  return new NonEmpty(element, tail);
}
function toList(elements, tail) {
  return List.fromArray(elements, tail);
}
var ListIterator = class {
  #current;
  constructor(current) {
    this.#current = current;
  }
  next() {
    if (this.#current instanceof Empty) {
      return { done: true };
    } else {
      let { head, tail } = this.#current;
      this.#current = tail;
      return { value: head, done: false };
    }
  }
};
var Empty = class extends List {
};
var NonEmpty = class extends List {
  constructor(head, tail) {
    super();
    this.head = head;
    this.tail = tail;
  }
};

// build/dev/javascript/gleam_stdlib/dict.mjs
var SHIFT = 5;
var BUCKET_SIZE = Math.pow(2, SHIFT);
var MASK = BUCKET_SIZE - 1;
var MAX_INDEX_NODE = BUCKET_SIZE / 2;
var MIN_ARRAY_NODE = BUCKET_SIZE / 4;

// build/dev/javascript/gleam_stdlib/gleam/string.mjs
function join_loop(loop$strings, loop$separator, loop$accumulator) {
  while (true) {
    let strings = loop$strings;
    let separator = loop$separator;
    let accumulator = loop$accumulator;
    if (strings instanceof Empty) {
      return accumulator;
    } else {
      let string2 = strings.head;
      let strings$1 = strings.tail;
      loop$strings = strings$1;
      loop$separator = separator;
      loop$accumulator = accumulator + separator + string2;
    }
  }
}
function join(strings, separator) {
  if (strings instanceof Empty) {
    return "";
  } else {
    let first$1 = strings.head;
    let rest = strings.tail;
    return join_loop(rest, separator, first$1);
  }
}

// build/dev/javascript/gleam_stdlib/gleam_stdlib.mjs
var unicode_whitespaces = [
  " ",
  // Space
  "	",
  // Horizontal tab
  "\n",
  // Line feed
  "\v",
  // Vertical tab
  "\f",
  // Form feed
  "\r",
  // Carriage return
  "\x85",
  // Next line
  "\u2028",
  // Line separator
  "\u2029"
  // Paragraph separator
].join("");
var trim_start_regex = /* @__PURE__ */ new RegExp(
  `^[${unicode_whitespaces}]*`
);
var trim_end_regex = /* @__PURE__ */ new RegExp(`[${unicode_whitespaces}]*$`);

// build/dev/javascript/gleam_stdlib/gleam/list.mjs
function prepend2(list2, item) {
  return prepend(item, list2);
}

// build/dev/javascript/dev_client/dev_client.ffi.mjs
var INITIAL_DELAY = 500;
var LONG_DELAY = 5e3;
var FAST_RETRY_DURATION = 5e3;
var SERVER_DOWN_TIME_KEY = "lastServerDowntimeMs";
var liveReloadWebSocket = null;
var reconnectTimeout = null;
var disconnectTime = null;
var connect = (ws_endpoint) => {
  clearTimeout(reconnectTimeout);
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  liveReloadWebSocket = new WebSocket(
    // TODO: get routes from server
    `${protocol}://${window.location.host}${ws_endpoint}`
  );
  liveReloadWebSocket.onopen = () => {
    if (disconnectTime) {
      const downtime = Date.now() - disconnectTime;
      sessionStorage.setItem(SERVER_DOWN_TIME_KEY, downtime);
      disconnectTime = null;
      window.location.reload();
    }
  };
  liveReloadWebSocket.onclose = () => {
    if (!disconnectTime) {
      disconnectTime = Date.now();
    }
    const downtime = Date.now() - disconnectTime;
    const nextDelay = downtime < FAST_RETRY_DURATION ? INITIAL_DELAY : LONG_DELAY;
    console.log(`WebSocket connection closed. Retrying in ${nextDelay / 1e3}s...`);
    reconnectTimeout = setTimeout(() => {
      connect(ws_endpoint);
    }, nextDelay);
  };
};

// build/dev/javascript/dev_client/dev_client.mjs
var path_segments = /* @__PURE__ */ toList(["ws"]);
function main() {
  let _pipe = path_segments;
  let _pipe$1 = prepend2(_pipe, "");
  let _pipe$2 = join(_pipe$1, "/");
  return connect(_pipe$2);
}

// build/.lustre/entry.mjs
main();
