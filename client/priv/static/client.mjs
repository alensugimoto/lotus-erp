// build/dev/javascript/prelude.mjs
var CustomType = class {
  withFields(fields) {
    let properties = Object.keys(this).map(
      (label2) => label2 in fields ? fields[label2] : this[label2]
    );
    return new this.constructor(...properties);
  }
};
var List = class {
  static fromArray(array3, tail) {
    let t = tail || new Empty();
    for (let i = array3.length - 1; i >= 0; --i) {
      t = new NonEmpty(array3[i], t);
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
    let length3 = 0;
    while (current) {
      current = current.tail;
      length3++;
    }
    return length3 - 1;
  }
};
function prepend(element7, tail) {
  return new NonEmpty(element7, tail);
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
var BitArray = class {
  /**
   * The size in bits of this bit array's data.
   *
   * @type {number}
   */
  bitSize;
  /**
   * The size in bytes of this bit array's data. If this bit array doesn't store
   * a whole number of bytes then this value is rounded up.
   *
   * @type {number}
   */
  byteSize;
  /**
   * The number of unused high bits in the first byte of this bit array's
   * buffer prior to the start of its data. The value of any unused high bits is
   * undefined.
   *
   * The bit offset will be in the range 0-7.
   *
   * @type {number}
   */
  bitOffset;
  /**
   * The raw bytes that hold this bit array's data.
   *
   * If `bitOffset` is not zero then there are unused high bits in the first
   * byte of this buffer.
   *
   * If `bitOffset + bitSize` is not a multiple of 8 then there are unused low
   * bits in the last byte of this buffer.
   *
   * @type {Uint8Array}
   */
  rawBuffer;
  /**
   * Constructs a new bit array from a `Uint8Array`, an optional size in
   * bits, and an optional bit offset.
   *
   * If no bit size is specified it is taken as `buffer.length * 8`, i.e. all
   * bytes in the buffer make up the new bit array's data.
   *
   * If no bit offset is specified it defaults to zero, i.e. there are no unused
   * high bits in the first byte of the buffer.
   *
   * @param {Uint8Array} buffer
   * @param {number} [bitSize]
   * @param {number} [bitOffset]
   */
  constructor(buffer, bitSize, bitOffset) {
    if (!(buffer instanceof Uint8Array)) {
      throw globalThis.Error(
        "BitArray can only be constructed from a Uint8Array"
      );
    }
    this.bitSize = bitSize ?? buffer.length * 8;
    this.byteSize = Math.trunc((this.bitSize + 7) / 8);
    this.bitOffset = bitOffset ?? 0;
    if (this.bitSize < 0) {
      throw globalThis.Error(`BitArray bit size is invalid: ${this.bitSize}`);
    }
    if (this.bitOffset < 0 || this.bitOffset > 7) {
      throw globalThis.Error(
        `BitArray bit offset is invalid: ${this.bitOffset}`
      );
    }
    if (buffer.length !== Math.trunc((this.bitOffset + this.bitSize + 7) / 8)) {
      throw globalThis.Error("BitArray buffer length is invalid");
    }
    this.rawBuffer = buffer;
  }
  /**
   * Returns a specific byte in this bit array. If the byte index is out of
   * range then `undefined` is returned.
   *
   * When returning the final byte of a bit array with a bit size that's not a
   * multiple of 8, the content of the unused low bits are undefined.
   *
   * @param {number} index
   * @returns {number | undefined}
   */
  byteAt(index4) {
    if (index4 < 0 || index4 >= this.byteSize) {
      return void 0;
    }
    return bitArrayByteAt(this.rawBuffer, this.bitOffset, index4);
  }
  /** @internal */
  equals(other) {
    if (this.bitSize !== other.bitSize) {
      return false;
    }
    const wholeByteCount = Math.trunc(this.bitSize / 8);
    if (this.bitOffset === 0 && other.bitOffset === 0) {
      for (let i = 0; i < wholeByteCount; i++) {
        if (this.rawBuffer[i] !== other.rawBuffer[i]) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (this.rawBuffer[wholeByteCount] >> unusedLowBitCount !== other.rawBuffer[wholeByteCount] >> unusedLowBitCount) {
          return false;
        }
      }
    } else {
      for (let i = 0; i < wholeByteCount; i++) {
        const a2 = bitArrayByteAt(this.rawBuffer, this.bitOffset, i);
        const b = bitArrayByteAt(other.rawBuffer, other.bitOffset, i);
        if (a2 !== b) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const a2 = bitArrayByteAt(
          this.rawBuffer,
          this.bitOffset,
          wholeByteCount
        );
        const b = bitArrayByteAt(
          other.rawBuffer,
          other.bitOffset,
          wholeByteCount
        );
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (a2 >> unusedLowBitCount !== b >> unusedLowBitCount) {
          return false;
        }
      }
    }
    return true;
  }
  /**
   * Returns this bit array's internal buffer.
   *
   * @deprecated Use `BitArray.byteAt()` or `BitArray.rawBuffer` instead.
   *
   * @returns {Uint8Array}
   */
  get buffer() {
    bitArrayPrintDeprecationWarning(
      "buffer",
      "Use BitArray.byteAt() or BitArray.rawBuffer instead"
    );
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error(
        "BitArray.buffer does not support unaligned bit arrays"
      );
    }
    return this.rawBuffer;
  }
  /**
   * Returns the length in bytes of this bit array's internal buffer.
   *
   * @deprecated Use `BitArray.bitSize` or `BitArray.byteSize` instead.
   *
   * @returns {number}
   */
  get length() {
    bitArrayPrintDeprecationWarning(
      "length",
      "Use BitArray.bitSize or BitArray.byteSize instead"
    );
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error(
        "BitArray.length does not support unaligned bit arrays"
      );
    }
    return this.rawBuffer.length;
  }
};
function bitArrayByteAt(buffer, bitOffset, index4) {
  if (bitOffset === 0) {
    return buffer[index4] ?? 0;
  } else {
    const a2 = buffer[index4] << bitOffset & 255;
    const b = buffer[index4 + 1] >> 8 - bitOffset;
    return a2 | b;
  }
}
var isBitArrayDeprecationMessagePrinted = {};
function bitArrayPrintDeprecationWarning(name3, message2) {
  if (isBitArrayDeprecationMessagePrinted[name3]) {
    return;
  }
  console.warn(
    `Deprecated BitArray.${name3} property used in JavaScript FFI code. ${message2}.`
  );
  isBitArrayDeprecationMessagePrinted[name3] = true;
}
var Result = class _Result extends CustomType {
  // @internal
  static isResult(data) {
    return data instanceof _Result;
  }
};
var Ok = class extends Result {
  constructor(value2) {
    super();
    this[0] = value2;
  }
  // @internal
  isOk() {
    return true;
  }
};
var Error = class extends Result {
  constructor(detail) {
    super();
    this[0] = detail;
  }
  // @internal
  isOk() {
    return false;
  }
};
function isEqual(x, y) {
  let values3 = [x, y];
  while (values3.length) {
    let a2 = values3.pop();
    let b = values3.pop();
    if (a2 === b) continue;
    if (!isObject(a2) || !isObject(b)) return false;
    let unequal = !structurallyCompatibleObjects(a2, b) || unequalDates(a2, b) || unequalBuffers(a2, b) || unequalArrays(a2, b) || unequalMaps(a2, b) || unequalSets(a2, b) || unequalRegExps(a2, b);
    if (unequal) return false;
    const proto = Object.getPrototypeOf(a2);
    if (proto !== null && typeof proto.equals === "function") {
      try {
        if (a2.equals(b)) continue;
        else return false;
      } catch {
      }
    }
    let [keys2, get2] = getters(a2);
    for (let k of keys2(a2)) {
      values3.push(get2(a2, k), get2(b, k));
    }
  }
  return true;
}
function getters(object3) {
  if (object3 instanceof Map) {
    return [(x) => x.keys(), (x, y) => x.get(y)];
  } else {
    let extra = object3 instanceof globalThis.Error ? ["message"] : [];
    return [(x) => [...extra, ...Object.keys(x)], (x, y) => x[y]];
  }
}
function unequalDates(a2, b) {
  return a2 instanceof Date && (a2 > b || a2 < b);
}
function unequalBuffers(a2, b) {
  return !(a2 instanceof BitArray) && a2.buffer instanceof ArrayBuffer && a2.BYTES_PER_ELEMENT && !(a2.byteLength === b.byteLength && a2.every((n, i) => n === b[i]));
}
function unequalArrays(a2, b) {
  return Array.isArray(a2) && a2.length !== b.length;
}
function unequalMaps(a2, b) {
  return a2 instanceof Map && a2.size !== b.size;
}
function unequalSets(a2, b) {
  return a2 instanceof Set && (a2.size != b.size || [...a2].some((e) => !b.has(e)));
}
function unequalRegExps(a2, b) {
  return a2 instanceof RegExp && (a2.source !== b.source || a2.flags !== b.flags);
}
function isObject(a2) {
  return typeof a2 === "object" && a2 !== null;
}
function structurallyCompatibleObjects(a2, b) {
  if (typeof a2 !== "object" && typeof b !== "object" && (!a2 || !b))
    return false;
  let nonstructural = [Promise, WeakSet, WeakMap, Function];
  if (nonstructural.some((c) => a2 instanceof c)) return false;
  return a2.constructor === b.constructor;
}
function makeError(variant, module, line, fn, message2, extra) {
  let error = new globalThis.Error(message2);
  error.gleam_error = variant;
  error.module = module;
  error.line = line;
  error.function = fn;
  error.fn = fn;
  for (let k in extra) error[k] = extra[k];
  return error;
}

// build/dev/javascript/gleam_stdlib/gleam/order.mjs
var Lt = class extends CustomType {
};
var Eq = class extends CustomType {
};
var Gt = class extends CustomType {
};

// build/dev/javascript/gleam_stdlib/gleam/option.mjs
var Some = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var None = class extends CustomType {
};
function from_result(result) {
  if (result.isOk()) {
    let a2 = result[0];
    return new Some(a2);
  } else {
    return new None();
  }
}
function lazy_unwrap(option, default$) {
  if (option instanceof Some) {
    let x = option[0];
    return x;
  } else {
    return default$();
  }
}
function map(option, fun) {
  if (option instanceof Some) {
    let x = option[0];
    return new Some(fun(x));
  } else {
    return new None();
  }
}
function or(first2, second2) {
  if (first2 instanceof Some) {
    return first2;
  } else {
    return second2;
  }
}
function lazy_or(first2, second2) {
  if (first2 instanceof Some) {
    return first2;
  } else {
    return second2();
  }
}

// build/dev/javascript/gleam_stdlib/dict.mjs
var referenceMap = /* @__PURE__ */ new WeakMap();
var tempDataView = /* @__PURE__ */ new DataView(
  /* @__PURE__ */ new ArrayBuffer(8)
);
var referenceUID = 0;
function hashByReference(o) {
  const known = referenceMap.get(o);
  if (known !== void 0) {
    return known;
  }
  const hash = referenceUID++;
  if (referenceUID === 2147483647) {
    referenceUID = 0;
  }
  referenceMap.set(o, hash);
  return hash;
}
function hashMerge(a2, b) {
  return a2 ^ b + 2654435769 + (a2 << 6) + (a2 >> 2) | 0;
}
function hashString(s) {
  let hash = 0;
  const len = s.length;
  for (let i = 0; i < len; i++) {
    hash = Math.imul(31, hash) + s.charCodeAt(i) | 0;
  }
  return hash;
}
function hashNumber(n) {
  tempDataView.setFloat64(0, n);
  const i = tempDataView.getInt32(0);
  const j = tempDataView.getInt32(4);
  return Math.imul(73244475, i >> 16 ^ i) ^ j;
}
function hashBigInt(n) {
  return hashString(n.toString());
}
function hashObject(o) {
  const proto = Object.getPrototypeOf(o);
  if (proto !== null && typeof proto.hashCode === "function") {
    try {
      const code = o.hashCode(o);
      if (typeof code === "number") {
        return code;
      }
    } catch {
    }
  }
  if (o instanceof Promise || o instanceof WeakSet || o instanceof WeakMap) {
    return hashByReference(o);
  }
  if (o instanceof Date) {
    return hashNumber(o.getTime());
  }
  let h = 0;
  if (o instanceof ArrayBuffer) {
    o = new Uint8Array(o);
  }
  if (Array.isArray(o) || o instanceof Uint8Array) {
    for (let i = 0; i < o.length; i++) {
      h = Math.imul(31, h) + getHash(o[i]) | 0;
    }
  } else if (o instanceof Set) {
    o.forEach((v) => {
      h = h + getHash(v) | 0;
    });
  } else if (o instanceof Map) {
    o.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
  } else {
    const keys2 = Object.keys(o);
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      const v = o[k];
      h = h + hashMerge(getHash(v), hashString(k)) | 0;
    }
  }
  return h;
}
function getHash(u) {
  if (u === null) return 1108378658;
  if (u === void 0) return 1108378659;
  if (u === true) return 1108378657;
  if (u === false) return 1108378656;
  switch (typeof u) {
    case "number":
      return hashNumber(u);
    case "string":
      return hashString(u);
    case "bigint":
      return hashBigInt(u);
    case "object":
      return hashObject(u);
    case "symbol":
      return hashByReference(u);
    case "function":
      return hashByReference(u);
    default:
      return 0;
  }
}
var SHIFT = 5;
var BUCKET_SIZE = Math.pow(2, SHIFT);
var MASK = BUCKET_SIZE - 1;
var MAX_INDEX_NODE = BUCKET_SIZE / 2;
var MIN_ARRAY_NODE = BUCKET_SIZE / 4;
var ENTRY = 0;
var ARRAY_NODE = 1;
var INDEX_NODE = 2;
var COLLISION_NODE = 3;
var EMPTY = {
  type: INDEX_NODE,
  bitmap: 0,
  array: []
};
function mask(hash, shift) {
  return hash >>> shift & MASK;
}
function bitpos(hash, shift) {
  return 1 << mask(hash, shift);
}
function bitcount(x) {
  x -= x >> 1 & 1431655765;
  x = (x & 858993459) + (x >> 2 & 858993459);
  x = x + (x >> 4) & 252645135;
  x += x >> 8;
  x += x >> 16;
  return x & 127;
}
function index(bitmap, bit) {
  return bitcount(bitmap & bit - 1);
}
function cloneAndSet(arr, at2, val) {
  const len = arr.length;
  const out = new Array(len);
  for (let i = 0; i < len; ++i) {
    out[i] = arr[i];
  }
  out[at2] = val;
  return out;
}
function spliceIn(arr, at2, val) {
  const len = arr.length;
  const out = new Array(len + 1);
  let i = 0;
  let g = 0;
  while (i < at2) {
    out[g++] = arr[i++];
  }
  out[g++] = val;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function spliceOut(arr, at2) {
  const len = arr.length;
  const out = new Array(len - 1);
  let i = 0;
  let g = 0;
  while (i < at2) {
    out[g++] = arr[i++];
  }
  ++i;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function createNode(shift, key1, val1, key2hash, key2, val2) {
  const key1hash = getHash(key1);
  if (key1hash === key2hash) {
    return {
      type: COLLISION_NODE,
      hash: key1hash,
      array: [
        { type: ENTRY, k: key1, v: val1 },
        { type: ENTRY, k: key2, v: val2 }
      ]
    };
  }
  const addedLeaf = { val: false };
  return assoc(
    assocIndex(EMPTY, shift, key1hash, key1, val1, addedLeaf),
    shift,
    key2hash,
    key2,
    val2,
    addedLeaf
  );
}
function assoc(root3, shift, hash, key, val, addedLeaf) {
  switch (root3.type) {
    case ARRAY_NODE:
      return assocArray(root3, shift, hash, key, val, addedLeaf);
    case INDEX_NODE:
      return assocIndex(root3, shift, hash, key, val, addedLeaf);
    case COLLISION_NODE:
      return assocCollision(root3, shift, hash, key, val, addedLeaf);
  }
}
function assocArray(root3, shift, hash, key, val, addedLeaf) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root3.size + 1,
      array: cloneAndSet(root3.array, idx, { type: ENTRY, k: key, v: val })
    };
  }
  if (node.type === ENTRY) {
    if (isEqual(key, node.k)) {
      if (val === node.v) {
        return root3;
      }
      return {
        type: ARRAY_NODE,
        size: root3.size,
        array: cloneAndSet(root3.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root3.size,
      array: cloneAndSet(
        root3.array,
        idx,
        createNode(shift + SHIFT, node.k, node.v, hash, key, val)
      )
    };
  }
  const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
  if (n === node) {
    return root3;
  }
  return {
    type: ARRAY_NODE,
    size: root3.size,
    array: cloneAndSet(root3.array, idx, n)
  };
}
function assocIndex(root3, shift, hash, key, val, addedLeaf) {
  const bit = bitpos(hash, shift);
  const idx = index(root3.bitmap, bit);
  if ((root3.bitmap & bit) !== 0) {
    const node = root3.array[idx];
    if (node.type !== ENTRY) {
      const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
      if (n === node) {
        return root3;
      }
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, n)
      };
    }
    const nodeKey = node.k;
    if (isEqual(key, nodeKey)) {
      if (val === node.v) {
        return root3;
      }
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap,
      array: cloneAndSet(
        root3.array,
        idx,
        createNode(shift + SHIFT, nodeKey, node.v, hash, key, val)
      )
    };
  } else {
    const n = root3.array.length;
    if (n >= MAX_INDEX_NODE) {
      const nodes = new Array(32);
      const jdx = mask(hash, shift);
      nodes[jdx] = assocIndex(EMPTY, shift + SHIFT, hash, key, val, addedLeaf);
      let j = 0;
      let bitmap = root3.bitmap;
      for (let i = 0; i < 32; i++) {
        if ((bitmap & 1) !== 0) {
          const node = root3.array[j++];
          nodes[i] = node;
        }
        bitmap = bitmap >>> 1;
      }
      return {
        type: ARRAY_NODE,
        size: n + 1,
        array: nodes
      };
    } else {
      const newArray = spliceIn(root3.array, idx, {
        type: ENTRY,
        k: key,
        v: val
      });
      addedLeaf.val = true;
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap | bit,
        array: newArray
      };
    }
  }
}
function assocCollision(root3, shift, hash, key, val, addedLeaf) {
  if (hash === root3.hash) {
    const idx = collisionIndexOf(root3, key);
    if (idx !== -1) {
      const entry = root3.array[idx];
      if (entry.v === val) {
        return root3;
      }
      return {
        type: COLLISION_NODE,
        hash,
        array: cloneAndSet(root3.array, idx, { type: ENTRY, k: key, v: val })
      };
    }
    const size2 = root3.array.length;
    addedLeaf.val = true;
    return {
      type: COLLISION_NODE,
      hash,
      array: cloneAndSet(root3.array, size2, { type: ENTRY, k: key, v: val })
    };
  }
  return assoc(
    {
      type: INDEX_NODE,
      bitmap: bitpos(root3.hash, shift),
      array: [root3]
    },
    shift,
    hash,
    key,
    val,
    addedLeaf
  );
}
function collisionIndexOf(root3, key) {
  const size2 = root3.array.length;
  for (let i = 0; i < size2; i++) {
    if (isEqual(key, root3.array[i].k)) {
      return i;
    }
  }
  return -1;
}
function find(root3, shift, hash, key) {
  switch (root3.type) {
    case ARRAY_NODE:
      return findArray(root3, shift, hash, key);
    case INDEX_NODE:
      return findIndex(root3, shift, hash, key);
    case COLLISION_NODE:
      return findCollision(root3, key);
  }
}
function findArray(root3, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    return void 0;
  }
  if (node.type !== ENTRY) {
    return find(node, shift + SHIFT, hash, key);
  }
  if (isEqual(key, node.k)) {
    return node;
  }
  return void 0;
}
function findIndex(root3, shift, hash, key) {
  const bit = bitpos(hash, shift);
  if ((root3.bitmap & bit) === 0) {
    return void 0;
  }
  const idx = index(root3.bitmap, bit);
  const node = root3.array[idx];
  if (node.type !== ENTRY) {
    return find(node, shift + SHIFT, hash, key);
  }
  if (isEqual(key, node.k)) {
    return node;
  }
  return void 0;
}
function findCollision(root3, key) {
  const idx = collisionIndexOf(root3, key);
  if (idx < 0) {
    return void 0;
  }
  return root3.array[idx];
}
function without(root3, shift, hash, key) {
  switch (root3.type) {
    case ARRAY_NODE:
      return withoutArray(root3, shift, hash, key);
    case INDEX_NODE:
      return withoutIndex(root3, shift, hash, key);
    case COLLISION_NODE:
      return withoutCollision(root3, key);
  }
}
function withoutArray(root3, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    return root3;
  }
  let n = void 0;
  if (node.type === ENTRY) {
    if (!isEqual(node.k, key)) {
      return root3;
    }
  } else {
    n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root3;
    }
  }
  if (n === void 0) {
    if (root3.size <= MIN_ARRAY_NODE) {
      const arr = root3.array;
      const out = new Array(root3.size - 1);
      let i = 0;
      let j = 0;
      let bitmap = 0;
      while (i < idx) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      ++i;
      while (i < arr.length) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      return {
        type: INDEX_NODE,
        bitmap,
        array: out
      };
    }
    return {
      type: ARRAY_NODE,
      size: root3.size - 1,
      array: cloneAndSet(root3.array, idx, n)
    };
  }
  return {
    type: ARRAY_NODE,
    size: root3.size,
    array: cloneAndSet(root3.array, idx, n)
  };
}
function withoutIndex(root3, shift, hash, key) {
  const bit = bitpos(hash, shift);
  if ((root3.bitmap & bit) === 0) {
    return root3;
  }
  const idx = index(root3.bitmap, bit);
  const node = root3.array[idx];
  if (node.type !== ENTRY) {
    const n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root3;
    }
    if (n !== void 0) {
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, n)
      };
    }
    if (root3.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap ^ bit,
      array: spliceOut(root3.array, idx)
    };
  }
  if (isEqual(key, node.k)) {
    if (root3.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap ^ bit,
      array: spliceOut(root3.array, idx)
    };
  }
  return root3;
}
function withoutCollision(root3, key) {
  const idx = collisionIndexOf(root3, key);
  if (idx < 0) {
    return root3;
  }
  if (root3.array.length === 1) {
    return void 0;
  }
  return {
    type: COLLISION_NODE,
    hash: root3.hash,
    array: spliceOut(root3.array, idx)
  };
}
function forEach(root3, fn) {
  if (root3 === void 0) {
    return;
  }
  const items = root3.array;
  const size2 = items.length;
  for (let i = 0; i < size2; i++) {
    const item = items[i];
    if (item === void 0) {
      continue;
    }
    if (item.type === ENTRY) {
      fn(item.v, item.k);
      continue;
    }
    forEach(item, fn);
  }
}
var Dict = class _Dict {
  /**
   * @template V
   * @param {Record<string,V>} o
   * @returns {Dict<string,V>}
   */
  static fromObject(o) {
    const keys2 = Object.keys(o);
    let m = _Dict.new();
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      m = m.set(k, o[k]);
    }
    return m;
  }
  /**
   * @template K,V
   * @param {Map<K,V>} o
   * @returns {Dict<K,V>}
   */
  static fromMap(o) {
    let m = _Dict.new();
    o.forEach((v, k) => {
      m = m.set(k, v);
    });
    return m;
  }
  static new() {
    return new _Dict(void 0, 0);
  }
  /**
   * @param {undefined | Node<K,V>} root
   * @param {number} size
   */
  constructor(root3, size2) {
    this.root = root3;
    this.size = size2;
  }
  /**
   * @template NotFound
   * @param {K} key
   * @param {NotFound} notFound
   * @returns {NotFound | V}
   */
  get(key, notFound) {
    if (this.root === void 0) {
      return notFound;
    }
    const found = find(this.root, 0, getHash(key), key);
    if (found === void 0) {
      return notFound;
    }
    return found.v;
  }
  /**
   * @param {K} key
   * @param {V} val
   * @returns {Dict<K,V>}
   */
  set(key, val) {
    const addedLeaf = { val: false };
    const root3 = this.root === void 0 ? EMPTY : this.root;
    const newRoot = assoc(root3, 0, getHash(key), key, val, addedLeaf);
    if (newRoot === this.root) {
      return this;
    }
    return new _Dict(newRoot, addedLeaf.val ? this.size + 1 : this.size);
  }
  /**
   * @param {K} key
   * @returns {Dict<K,V>}
   */
  delete(key) {
    if (this.root === void 0) {
      return this;
    }
    const newRoot = without(this.root, 0, getHash(key), key);
    if (newRoot === this.root) {
      return this;
    }
    if (newRoot === void 0) {
      return _Dict.new();
    }
    return new _Dict(newRoot, this.size - 1);
  }
  /**
   * @param {K} key
   * @returns {boolean}
   */
  has(key) {
    if (this.root === void 0) {
      return false;
    }
    return find(this.root, 0, getHash(key), key) !== void 0;
  }
  /**
   * @returns {[K,V][]}
   */
  entries() {
    if (this.root === void 0) {
      return [];
    }
    const result = [];
    this.forEach((v, k) => result.push([k, v]));
    return result;
  }
  /**
   *
   * @param {(val:V,key:K)=>void} fn
   */
  forEach(fn) {
    forEach(this.root, fn);
  }
  hashCode() {
    let h = 0;
    this.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
    return h;
  }
  /**
   * @param {unknown} o
   * @returns {boolean}
   */
  equals(o) {
    if (!(o instanceof _Dict) || this.size !== o.size) {
      return false;
    }
    try {
      this.forEach((v, k) => {
        if (!isEqual(o.get(k, !v), v)) {
          throw unequalDictSymbol;
        }
      });
      return true;
    } catch (e) {
      if (e === unequalDictSymbol) {
        return false;
      }
      throw e;
    }
  }
};
var unequalDictSymbol = /* @__PURE__ */ Symbol();

// build/dev/javascript/gleam_stdlib/gleam/dict.mjs
function insert(dict2, key, value2) {
  return map_insert(key, value2, dict2);
}
function reverse_and_concat(loop$remaining, loop$accumulator) {
  while (true) {
    let remaining = loop$remaining;
    let accumulator = loop$accumulator;
    if (remaining.hasLength(0)) {
      return accumulator;
    } else {
      let first2 = remaining.head;
      let rest = remaining.tail;
      loop$remaining = rest;
      loop$accumulator = prepend(first2, accumulator);
    }
  }
}
function do_keys_loop(loop$list, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let acc = loop$acc;
    if (list4.hasLength(0)) {
      return reverse_and_concat(acc, toList([]));
    } else {
      let key = list4.head[0];
      let rest = list4.tail;
      loop$list = rest;
      loop$acc = prepend(key, acc);
    }
  }
}
function keys(dict2) {
  return do_keys_loop(map_to_list(dict2), toList([]));
}
function delete$(dict2, key) {
  return map_remove(key, dict2);
}
function upsert(dict2, key, fun) {
  let $ = map_get(dict2, key);
  if ($.isOk()) {
    let value2 = $[0];
    return insert(dict2, key, fun(new Some(value2)));
  } else {
    return insert(dict2, key, fun(new None()));
  }
}
function fold_loop(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list4 = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list4.hasLength(0)) {
      return initial;
    } else {
      let k = list4.head[0];
      let v = list4.head[1];
      let rest = list4.tail;
      loop$list = rest;
      loop$initial = fun(initial, k, v);
      loop$fun = fun;
    }
  }
}
function fold(dict2, initial, fun) {
  return fold_loop(map_to_list(dict2), initial, fun);
}
function do_map_values(f, dict2) {
  let f$1 = (dict3, k, v) => {
    return insert(dict3, k, f(k, v));
  };
  return fold(dict2, new_map(), f$1);
}
function map_values(dict2, fun) {
  return do_map_values(fun, dict2);
}

// build/dev/javascript/gleam_stdlib/gleam/dynamic.mjs
function nil() {
  return identity(void 0);
}

// build/dev/javascript/gleam_stdlib/gleam/list.mjs
var Continue = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Stop = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Ascending = class extends CustomType {
};
var Descending = class extends CustomType {
};
function reverse_and_prepend(loop$prefix, loop$suffix) {
  while (true) {
    let prefix = loop$prefix;
    let suffix = loop$suffix;
    if (prefix.hasLength(0)) {
      return suffix;
    } else {
      let first$1 = prefix.head;
      let rest$1 = prefix.tail;
      loop$prefix = rest$1;
      loop$suffix = prepend(first$1, suffix);
    }
  }
}
function reverse(list4) {
  return reverse_and_prepend(list4, toList([]));
}
function first(list4) {
  if (list4.hasLength(0)) {
    return new Error(void 0);
  } else {
    let first$1 = list4.head;
    return new Ok(first$1);
  }
}
function filter_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list4.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      let _block;
      let $ = fun(first$1);
      if ($) {
        _block = prepend(first$1, acc);
      } else {
        _block = acc;
      }
      let new_acc = _block;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = new_acc;
    }
  }
}
function filter(list4, predicate) {
  return filter_loop(list4, predicate, toList([]));
}
function map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list4.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = prepend(fun(first$1), acc);
    }
  }
}
function map2(list4, fun) {
  return map_loop(list4, fun, toList([]));
}
function try_map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list4.hasLength(0)) {
      return new Ok(reverse(acc));
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      let $ = fun(first$1);
      if ($.isOk()) {
        let first$2 = $[0];
        loop$list = rest$1;
        loop$fun = fun;
        loop$acc = prepend(first$2, acc);
      } else {
        let error = $[0];
        return new Error(error);
      }
    }
  }
}
function try_map(list4, fun) {
  return try_map_loop(list4, fun, toList([]));
}
function append_loop(loop$first, loop$second) {
  while (true) {
    let first2 = loop$first;
    let second2 = loop$second;
    if (first2.hasLength(0)) {
      return second2;
    } else {
      let first$1 = first2.head;
      let rest$1 = first2.tail;
      loop$first = rest$1;
      loop$second = prepend(first$1, second2);
    }
  }
}
function append(first2, second2) {
  return append_loop(reverse(first2), second2);
}
function prepend2(list4, item) {
  return prepend(item, list4);
}
function fold2(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list4 = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list4.hasLength(0)) {
      return initial;
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      loop$list = rest$1;
      loop$initial = fun(initial, first$1);
      loop$fun = fun;
    }
  }
}
function fold_right(list4, initial, fun) {
  if (list4.hasLength(0)) {
    return initial;
  } else {
    let first$1 = list4.head;
    let rest$1 = list4.tail;
    return fun(fold_right(rest$1, initial, fun), first$1);
  }
}
function fold_until(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list4 = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list4.hasLength(0)) {
      return initial;
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      let $ = fun(initial, first$1);
      if ($ instanceof Continue) {
        let next_accumulator = $[0];
        loop$list = rest$1;
        loop$initial = next_accumulator;
        loop$fun = fun;
      } else {
        let b = $[0];
        return b;
      }
    }
  }
}
function find2(loop$list, loop$is_desired) {
  while (true) {
    let list4 = loop$list;
    let is_desired = loop$is_desired;
    if (list4.hasLength(0)) {
      return new Error(void 0);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      let $ = is_desired(first$1);
      if ($) {
        return new Ok(first$1);
      } else {
        loop$list = rest$1;
        loop$is_desired = is_desired;
      }
    }
  }
}
function sequences(loop$list, loop$compare, loop$growing, loop$direction, loop$prev, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let compare5 = loop$compare;
    let growing = loop$growing;
    let direction = loop$direction;
    let prev = loop$prev;
    let acc = loop$acc;
    let growing$1 = prepend(prev, growing);
    if (list4.hasLength(0)) {
      if (direction instanceof Ascending) {
        return prepend(reverse(growing$1), acc);
      } else {
        return prepend(growing$1, acc);
      }
    } else {
      let new$1 = list4.head;
      let rest$1 = list4.tail;
      let $ = compare5(prev, new$1);
      if ($ instanceof Gt && direction instanceof Descending) {
        loop$list = rest$1;
        loop$compare = compare5;
        loop$growing = growing$1;
        loop$direction = direction;
        loop$prev = new$1;
        loop$acc = acc;
      } else if ($ instanceof Lt && direction instanceof Ascending) {
        loop$list = rest$1;
        loop$compare = compare5;
        loop$growing = growing$1;
        loop$direction = direction;
        loop$prev = new$1;
        loop$acc = acc;
      } else if ($ instanceof Eq && direction instanceof Ascending) {
        loop$list = rest$1;
        loop$compare = compare5;
        loop$growing = growing$1;
        loop$direction = direction;
        loop$prev = new$1;
        loop$acc = acc;
      } else if ($ instanceof Gt && direction instanceof Ascending) {
        let _block;
        if (direction instanceof Ascending) {
          _block = prepend(reverse(growing$1), acc);
        } else {
          _block = prepend(growing$1, acc);
        }
        let acc$1 = _block;
        if (rest$1.hasLength(0)) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next = rest$1.head;
          let rest$2 = rest$1.tail;
          let _block$1;
          let $1 = compare5(new$1, next);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare5;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      } else if ($ instanceof Lt && direction instanceof Descending) {
        let _block;
        if (direction instanceof Ascending) {
          _block = prepend(reverse(growing$1), acc);
        } else {
          _block = prepend(growing$1, acc);
        }
        let acc$1 = _block;
        if (rest$1.hasLength(0)) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next = rest$1.head;
          let rest$2 = rest$1.tail;
          let _block$1;
          let $1 = compare5(new$1, next);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare5;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      } else {
        let _block;
        if (direction instanceof Ascending) {
          _block = prepend(reverse(growing$1), acc);
        } else {
          _block = prepend(growing$1, acc);
        }
        let acc$1 = _block;
        if (rest$1.hasLength(0)) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next = rest$1.head;
          let rest$2 = rest$1.tail;
          let _block$1;
          let $1 = compare5(new$1, next);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare5;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      }
    }
  }
}
function merge_ascendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list22 = loop$list2;
    let compare5 = loop$compare;
    let acc = loop$acc;
    if (list1.hasLength(0)) {
      let list4 = list22;
      return reverse_and_prepend(list4, acc);
    } else if (list22.hasLength(0)) {
      let list4 = list1;
      return reverse_and_prepend(list4, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list22.head;
      let rest2 = list22.tail;
      let $ = compare5(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare5;
        loop$acc = prepend(first1, acc);
      } else if ($ instanceof Gt) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare5;
        loop$acc = prepend(first2, acc);
      } else {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare5;
        loop$acc = prepend(first2, acc);
      }
    }
  }
}
function merge_ascending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare5 = loop$compare;
    let acc = loop$acc;
    if (sequences2.hasLength(0)) {
      return reverse(acc);
    } else if (sequences2.hasLength(1)) {
      let sequence = sequences2.head;
      return reverse(prepend(reverse(sequence), acc));
    } else {
      let ascending1 = sequences2.head;
      let ascending2 = sequences2.tail.head;
      let rest$1 = sequences2.tail.tail;
      let descending = merge_ascendings(
        ascending1,
        ascending2,
        compare5,
        toList([])
      );
      loop$sequences = rest$1;
      loop$compare = compare5;
      loop$acc = prepend(descending, acc);
    }
  }
}
function merge_descendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list22 = loop$list2;
    let compare5 = loop$compare;
    let acc = loop$acc;
    if (list1.hasLength(0)) {
      let list4 = list22;
      return reverse_and_prepend(list4, acc);
    } else if (list22.hasLength(0)) {
      let list4 = list1;
      return reverse_and_prepend(list4, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list22.head;
      let rest2 = list22.tail;
      let $ = compare5(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare5;
        loop$acc = prepend(first2, acc);
      } else if ($ instanceof Gt) {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare5;
        loop$acc = prepend(first1, acc);
      } else {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare5;
        loop$acc = prepend(first1, acc);
      }
    }
  }
}
function merge_descending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare5 = loop$compare;
    let acc = loop$acc;
    if (sequences2.hasLength(0)) {
      return reverse(acc);
    } else if (sequences2.hasLength(1)) {
      let sequence = sequences2.head;
      return reverse(prepend(reverse(sequence), acc));
    } else {
      let descending1 = sequences2.head;
      let descending2 = sequences2.tail.head;
      let rest$1 = sequences2.tail.tail;
      let ascending = merge_descendings(
        descending1,
        descending2,
        compare5,
        toList([])
      );
      loop$sequences = rest$1;
      loop$compare = compare5;
      loop$acc = prepend(ascending, acc);
    }
  }
}
function merge_all(loop$sequences, loop$direction, loop$compare) {
  while (true) {
    let sequences2 = loop$sequences;
    let direction = loop$direction;
    let compare5 = loop$compare;
    if (sequences2.hasLength(0)) {
      return toList([]);
    } else if (sequences2.hasLength(1) && direction instanceof Ascending) {
      let sequence = sequences2.head;
      return sequence;
    } else if (sequences2.hasLength(1) && direction instanceof Descending) {
      let sequence = sequences2.head;
      return reverse(sequence);
    } else if (direction instanceof Ascending) {
      let sequences$1 = merge_ascending_pairs(sequences2, compare5, toList([]));
      loop$sequences = sequences$1;
      loop$direction = new Descending();
      loop$compare = compare5;
    } else {
      let sequences$1 = merge_descending_pairs(sequences2, compare5, toList([]));
      loop$sequences = sequences$1;
      loop$direction = new Ascending();
      loop$compare = compare5;
    }
  }
}
function sort(list4, compare5) {
  if (list4.hasLength(0)) {
    return toList([]);
  } else if (list4.hasLength(1)) {
    let x = list4.head;
    return toList([x]);
  } else {
    let x = list4.head;
    let y = list4.tail.head;
    let rest$1 = list4.tail.tail;
    let _block;
    let $ = compare5(x, y);
    if ($ instanceof Lt) {
      _block = new Ascending();
    } else if ($ instanceof Eq) {
      _block = new Ascending();
    } else {
      _block = new Descending();
    }
    let direction = _block;
    let sequences$1 = sequences(
      rest$1,
      compare5,
      toList([x]),
      direction,
      y,
      toList([])
    );
    return merge_all(sequences$1, new Ascending(), compare5);
  }
}
function last(loop$list) {
  while (true) {
    let list4 = loop$list;
    if (list4.hasLength(0)) {
      return new Error(void 0);
    } else if (list4.hasLength(1)) {
      let last$1 = list4.head;
      return new Ok(last$1);
    } else {
      let rest$1 = list4.tail;
      loop$list = rest$1;
    }
  }
}
function max_loop(loop$list, loop$compare, loop$max) {
  while (true) {
    let list4 = loop$list;
    let compare5 = loop$compare;
    let max3 = loop$max;
    if (list4.hasLength(0)) {
      return max3;
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      let $ = compare5(first$1, max3);
      if ($ instanceof Gt) {
        loop$list = rest$1;
        loop$compare = compare5;
        loop$max = first$1;
      } else if ($ instanceof Lt) {
        loop$list = rest$1;
        loop$compare = compare5;
        loop$max = max3;
      } else {
        loop$list = rest$1;
        loop$compare = compare5;
        loop$max = max3;
      }
    }
  }
}
function max(list4, compare5) {
  if (list4.hasLength(0)) {
    return new Error(void 0);
  } else {
    let first$1 = list4.head;
    let rest$1 = list4.tail;
    return new Ok(max_loop(rest$1, compare5, first$1));
  }
}

// build/dev/javascript/gleam_stdlib/gleam/string.mjs
function is_empty(str) {
  return str === "";
}
function concat_loop(loop$strings, loop$accumulator) {
  while (true) {
    let strings = loop$strings;
    let accumulator = loop$accumulator;
    if (strings.atLeastLength(1)) {
      let string5 = strings.head;
      let strings$1 = strings.tail;
      loop$strings = strings$1;
      loop$accumulator = accumulator + string5;
    } else {
      return accumulator;
    }
  }
}
function concat2(strings) {
  return concat_loop(strings, "");
}
function join_loop(loop$strings, loop$separator, loop$accumulator) {
  while (true) {
    let strings = loop$strings;
    let separator = loop$separator;
    let accumulator = loop$accumulator;
    if (strings.hasLength(0)) {
      return accumulator;
    } else {
      let string5 = strings.head;
      let strings$1 = strings.tail;
      loop$strings = strings$1;
      loop$separator = separator;
      loop$accumulator = accumulator + separator + string5;
    }
  }
}
function join(strings, separator) {
  if (strings.hasLength(0)) {
    return "";
  } else {
    let first$1 = strings.head;
    let rest = strings.tail;
    return join_loop(rest, separator, first$1);
  }
}
function split2(x, substring) {
  if (substring === "") {
    return graphemes(x);
  } else {
    let _pipe = x;
    let _pipe$1 = identity(_pipe);
    let _pipe$2 = split(_pipe$1, substring);
    return map2(_pipe$2, identity);
  }
}

// build/dev/javascript/gleam_stdlib/gleam/dynamic/decode.mjs
var DecodeError = class extends CustomType {
  constructor(expected, found, path2) {
    super();
    this.expected = expected;
    this.found = found;
    this.path = path2;
  }
};
var Decoder = class extends CustomType {
  constructor(function$) {
    super();
    this.function = function$;
  }
};
function run(data, decoder) {
  let $ = decoder.function(data);
  let maybe_invalid_data = $[0];
  let errors = $[1];
  if (errors.hasLength(0)) {
    return new Ok(maybe_invalid_data);
  } else {
    return new Error(errors);
  }
}
function success(data) {
  return new Decoder((_) => {
    return [data, toList([])];
  });
}
function decode_dynamic(data) {
  return [data, toList([])];
}
function map3(decoder, transformer) {
  return new Decoder(
    (d) => {
      let $ = decoder.function(d);
      let data = $[0];
      let errors = $[1];
      return [transformer(data), errors];
    }
  );
}
function then$(decoder, next) {
  return new Decoder(
    (dynamic_data) => {
      let $ = decoder.function(dynamic_data);
      let data = $[0];
      let errors = $[1];
      let decoder$1 = next(data);
      let $1 = decoder$1.function(dynamic_data);
      let layer = $1;
      let data$1 = $1[0];
      if (errors.hasLength(0)) {
        return layer;
      } else {
        return [data$1, errors];
      }
    }
  );
}
function run_decoders(loop$data, loop$failure, loop$decoders) {
  while (true) {
    let data = loop$data;
    let failure2 = loop$failure;
    let decoders = loop$decoders;
    if (decoders.hasLength(0)) {
      return failure2;
    } else {
      let decoder = decoders.head;
      let decoders$1 = decoders.tail;
      let $ = decoder.function(data);
      let layer = $;
      let errors = $[1];
      if (errors.hasLength(0)) {
        return layer;
      } else {
        loop$data = data;
        loop$failure = failure2;
        loop$decoders = decoders$1;
      }
    }
  }
}
function one_of(first2, alternatives) {
  return new Decoder(
    (dynamic_data) => {
      let $ = first2.function(dynamic_data);
      let layer = $;
      let errors = $[1];
      if (errors.hasLength(0)) {
        return layer;
      } else {
        return run_decoders(dynamic_data, layer, alternatives);
      }
    }
  );
}
var dynamic = /* @__PURE__ */ new Decoder(decode_dynamic);
function decode_error(expected, found) {
  return toList([
    new DecodeError(expected, classify_dynamic(found), toList([]))
  ]);
}
function run_dynamic_function(data, name3, f) {
  let $ = f(data);
  if ($.isOk()) {
    let data$1 = $[0];
    return [data$1, toList([])];
  } else {
    let zero = $[0];
    return [
      zero,
      toList([new DecodeError(name3, classify_dynamic(data), toList([]))])
    ];
  }
}
function decode_int(data) {
  return run_dynamic_function(data, "Int", int);
}
function failure(zero, expected) {
  return new Decoder((d) => {
    return [zero, decode_error(expected, d)];
  });
}
var int2 = /* @__PURE__ */ new Decoder(decode_int);
function decode_string(data) {
  return run_dynamic_function(data, "String", string);
}
var string2 = /* @__PURE__ */ new Decoder(decode_string);
function list2(inner) {
  return new Decoder(
    (data) => {
      return list(
        data,
        inner.function,
        (p2, k) => {
          return push_path(p2, toList([k]));
        },
        0,
        toList([])
      );
    }
  );
}
function push_path(layer, path2) {
  let decoder = one_of(
    string2,
    toList([
      (() => {
        let _pipe = int2;
        return map3(_pipe, to_string);
      })()
    ])
  );
  let path$1 = map2(
    path2,
    (key) => {
      let key$1 = identity(key);
      let $ = run(key$1, decoder);
      if ($.isOk()) {
        let key$2 = $[0];
        return key$2;
      } else {
        return "<" + classify_dynamic(key$1) + ">";
      }
    }
  );
  let errors = map2(
    layer[1],
    (error) => {
      let _record = error;
      return new DecodeError(
        _record.expected,
        _record.found,
        append(path$1, error.path)
      );
    }
  );
  return [layer[0], errors];
}
function index3(loop$path, loop$position, loop$inner, loop$data, loop$handle_miss) {
  while (true) {
    let path2 = loop$path;
    let position = loop$position;
    let inner = loop$inner;
    let data = loop$data;
    let handle_miss = loop$handle_miss;
    if (path2.hasLength(0)) {
      let _pipe = inner(data);
      return push_path(_pipe, reverse(position));
    } else {
      let key = path2.head;
      let path$1 = path2.tail;
      let $ = index2(data, key);
      if ($.isOk() && $[0] instanceof Some) {
        let data$1 = $[0][0];
        loop$path = path$1;
        loop$position = prepend(key, position);
        loop$inner = inner;
        loop$data = data$1;
        loop$handle_miss = handle_miss;
      } else if ($.isOk() && $[0] instanceof None) {
        return handle_miss(data, prepend(key, position));
      } else {
        let kind = $[0];
        let $1 = inner(data);
        let default$ = $1[0];
        let _pipe = [
          default$,
          toList([new DecodeError(kind, classify_dynamic(data), toList([]))])
        ];
        return push_path(_pipe, reverse(position));
      }
    }
  }
}
function subfield(field_path, field_decoder, next) {
  return new Decoder(
    (data) => {
      let $ = index3(
        field_path,
        toList([]),
        field_decoder.function,
        data,
        (data2, position) => {
          let $12 = field_decoder.function(data2);
          let default$ = $12[0];
          let _pipe = [
            default$,
            toList([new DecodeError("Field", "Nothing", toList([]))])
          ];
          return push_path(_pipe, reverse(position));
        }
      );
      let out = $[0];
      let errors1 = $[1];
      let $1 = next(out).function(data);
      let out$1 = $1[0];
      let errors2 = $1[1];
      return [out$1, append(errors1, errors2)];
    }
  );
}
function at(path2, inner) {
  return new Decoder(
    (data) => {
      return index3(
        path2,
        toList([]),
        inner.function,
        data,
        (data2, position) => {
          let $ = inner.function(data2);
          let default$ = $[0];
          let _pipe = [
            default$,
            toList([new DecodeError("Field", "Nothing", toList([]))])
          ];
          return push_path(_pipe, reverse(position));
        }
      );
    }
  );
}
function field(field_name, field_decoder, next) {
  return subfield(toList([field_name]), field_decoder, next);
}

// build/dev/javascript/gleam_stdlib/gleam_stdlib.mjs
var Nil = void 0;
var NOT_FOUND = {};
function identity(x) {
  return x;
}
function parse_int(value2) {
  if (/^[-+]?(\d+)$/.test(value2)) {
    return new Ok(parseInt(value2));
  } else {
    return new Error(Nil);
  }
}
function parse_float(value2) {
  if (/^[-+]?(\d+)\.(\d+)([eE][-+]?\d+)?$/.test(value2)) {
    return new Ok(parseFloat(value2));
  } else {
    return new Error(Nil);
  }
}
function to_string(term) {
  return term.toString();
}
function graphemes(string5) {
  const iterator = graphemes_iterator(string5);
  if (iterator) {
    return List.fromArray(Array.from(iterator).map((item) => item.segment));
  } else {
    return List.fromArray(string5.match(/./gsu));
  }
}
var segmenter = void 0;
function graphemes_iterator(string5) {
  if (globalThis.Intl && Intl.Segmenter) {
    segmenter ||= new Intl.Segmenter();
    return segmenter.segment(string5)[Symbol.iterator]();
  }
}
function lowercase(string5) {
  return string5.toLowerCase();
}
function split(xs, pattern) {
  return List.fromArray(xs.split(pattern));
}
function starts_with(haystack, needle) {
  return haystack.startsWith(needle);
}
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
function new_map() {
  return Dict.new();
}
function map_to_list(map5) {
  return List.fromArray(map5.entries());
}
function map_remove(key, map5) {
  return map5.delete(key);
}
function map_get(map5, key) {
  const value2 = map5.get(key, NOT_FOUND);
  if (value2 === NOT_FOUND) {
    return new Error(Nil);
  }
  return new Ok(value2);
}
function map_insert(key, value2, map5) {
  return map5.set(key, value2);
}
function classify_dynamic(data) {
  if (typeof data === "string") {
    return "String";
  } else if (typeof data === "boolean") {
    return "Bool";
  } else if (data instanceof Result) {
    return "Result";
  } else if (data instanceof List) {
    return "List";
  } else if (data instanceof BitArray) {
    return "BitArray";
  } else if (data instanceof Dict) {
    return "Dict";
  } else if (Number.isInteger(data)) {
    return "Int";
  } else if (Array.isArray(data)) {
    return `Array`;
  } else if (typeof data === "number") {
    return "Float";
  } else if (data === null) {
    return "Nil";
  } else if (data === void 0) {
    return "Nil";
  } else {
    const type = typeof data;
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
function index2(data, key) {
  if (data instanceof Dict || data instanceof WeakMap || data instanceof Map) {
    const token2 = {};
    const entry = data.get(key, token2);
    if (entry === token2) return new Ok(new None());
    return new Ok(new Some(entry));
  }
  const key_is_int = Number.isInteger(key);
  if (key_is_int && key >= 0 && key < 8 && data instanceof List) {
    let i = 0;
    for (const value2 of data) {
      if (i === key) return new Ok(new Some(value2));
      i++;
    }
    return new Error("Indexable");
  }
  if (key_is_int && Array.isArray(data) || data && typeof data === "object" || data && Object.getPrototypeOf(data) === Object.prototype) {
    if (key in data) return new Ok(new Some(data[key]));
    return new Ok(new None());
  }
  return new Error(key_is_int ? "Indexable" : "Dict");
}
function list(data, decode2, pushPath, index4, emptyList) {
  if (!(data instanceof List || Array.isArray(data))) {
    const error = new DecodeError("List", classify_dynamic(data), emptyList);
    return [emptyList, List.fromArray([error])];
  }
  const decoded = [];
  for (const element7 of data) {
    const layer = decode2(element7);
    const [out, errors] = layer;
    if (errors instanceof NonEmpty) {
      const [_, errors2] = pushPath(layer, index4.toString());
      return [emptyList, errors2];
    }
    decoded.push(out);
    index4++;
  }
  return [List.fromArray(decoded), emptyList];
}
function int(data) {
  if (Number.isInteger(data)) return new Ok(data);
  return new Error(0);
}
function string(data) {
  if (typeof data === "string") return new Ok(data);
  return new Error("");
}

// build/dev/javascript/gleam_stdlib/gleam/int.mjs
function compare2(a2, b) {
  let $ = a2 === b;
  if ($) {
    return new Eq();
  } else {
    let $1 = a2 < b;
    if ($1) {
      return new Lt();
    } else {
      return new Gt();
    }
  }
}

// build/dev/javascript/gleam_stdlib/gleam/uri.mjs
var Uri = class extends CustomType {
  constructor(scheme, userinfo, host, port, path2, query, fragment3) {
    super();
    this.scheme = scheme;
    this.userinfo = userinfo;
    this.host = host;
    this.port = port;
    this.path = path2;
    this.query = query;
    this.fragment = fragment3;
  }
};
function remove_dot_segments_loop(loop$input, loop$accumulator) {
  while (true) {
    let input3 = loop$input;
    let accumulator = loop$accumulator;
    if (input3.hasLength(0)) {
      return reverse(accumulator);
    } else {
      let segment = input3.head;
      let rest = input3.tail;
      let _block;
      if (segment === "") {
        let accumulator$12 = accumulator;
        _block = accumulator$12;
      } else if (segment === ".") {
        let accumulator$12 = accumulator;
        _block = accumulator$12;
      } else if (segment === ".." && accumulator.hasLength(0)) {
        _block = toList([]);
      } else if (segment === ".." && accumulator.atLeastLength(1)) {
        let accumulator$12 = accumulator.tail;
        _block = accumulator$12;
      } else {
        let segment$1 = segment;
        let accumulator$12 = accumulator;
        _block = prepend(segment$1, accumulator$12);
      }
      let accumulator$1 = _block;
      loop$input = rest;
      loop$accumulator = accumulator$1;
    }
  }
}
function remove_dot_segments(input3) {
  return remove_dot_segments_loop(input3, toList([]));
}
function path_segments(path2) {
  return remove_dot_segments(split2(path2, "/"));
}

// build/dev/javascript/gleam_stdlib/gleam/bool.mjs
function guard(requirement, consequence, alternative) {
  if (requirement) {
    return consequence;
  } else {
    return alternative();
  }
}

// build/dev/javascript/gleam_stdlib/gleam/function.mjs
function identity2(x) {
  return x;
}

// build/dev/javascript/gleam_stdlib/gleam/result.mjs
function is_ok(result) {
  if (!result.isOk()) {
    return false;
  } else {
    return true;
  }
}
function map4(result, fun) {
  if (result.isOk()) {
    let x = result[0];
    return new Ok(fun(x));
  } else {
    let e = result[0];
    return new Error(e);
  }
}
function map_error(result, fun) {
  if (result.isOk()) {
    let x = result[0];
    return new Ok(x);
  } else {
    let error = result[0];
    return new Error(fun(error));
  }
}
function try$(result, fun) {
  if (result.isOk()) {
    let x = result[0];
    return fun(x);
  } else {
    let e = result[0];
    return new Error(e);
  }
}
function unwrap(result, default$) {
  if (result.isOk()) {
    let v = result[0];
    return v;
  } else {
    return default$;
  }
}
function lazy_unwrap2(result, default$) {
  if (result.isOk()) {
    let v = result[0];
    return v;
  } else {
    return default$();
  }
}
function unwrap_both(result) {
  if (result.isOk()) {
    let a2 = result[0];
    return a2;
  } else {
    let a2 = result[0];
    return a2;
  }
}
function replace_error(result, error) {
  if (result.isOk()) {
    let x = result[0];
    return new Ok(x);
  } else {
    return new Error(error);
  }
}
function try_recover(result, fun) {
  if (result.isOk()) {
    let value2 = result[0];
    return new Ok(value2);
  } else {
    let error = result[0];
    return fun(error);
  }
}

// build/dev/javascript/gleam_json/gleam_json_ffi.mjs
function object(entries) {
  return Object.fromEntries(entries);
}
function identity3(x) {
  return x;
}
function array(list4) {
  return list4.toArray();
}

// build/dev/javascript/gleam_json/gleam/json.mjs
function string3(input3) {
  return identity3(input3);
}
function bool(input3) {
  return identity3(input3);
}
function int3(input3) {
  return identity3(input3);
}
function float2(input3) {
  return identity3(input3);
}
function object2(entries) {
  return object(entries);
}
function preprocessed_array(from2) {
  return array(from2);
}
function array2(entries, inner_type) {
  let _pipe = entries;
  let _pipe$1 = map2(_pipe, inner_type);
  return preprocessed_array(_pipe$1);
}

// build/dev/javascript/gleam_stdlib/gleam/set.mjs
var Set2 = class extends CustomType {
  constructor(dict2) {
    super();
    this.dict = dict2;
  }
};
function new$() {
  return new Set2(new_map());
}
function contains(set, member) {
  let _pipe = set.dict;
  let _pipe$1 = map_get(_pipe, member);
  return is_ok(_pipe$1);
}
var token = void 0;
function insert2(set, member) {
  return new Set2(insert(set.dict, member, token));
}

// build/dev/javascript/lustre/lustre/internals/constants.ffi.mjs
var EMPTY_DICT = /* @__PURE__ */ Dict.new();
function empty_dict() {
  return EMPTY_DICT;
}
var EMPTY_SET = /* @__PURE__ */ new$();
function empty_set() {
  return EMPTY_SET;
}
var document2 = globalThis?.document;
var NAMESPACE_HTML = "http://www.w3.org/1999/xhtml";
var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
var DOCUMENT_FRAGMENT_NODE = 11;
var SUPPORTS_MOVE_BEFORE = !!globalThis.HTMLElement?.prototype?.moveBefore;

// build/dev/javascript/lustre/lustre/internals/constants.mjs
var empty_list = /* @__PURE__ */ toList([]);
var option_none = /* @__PURE__ */ new None();

// build/dev/javascript/lustre/lustre/vdom/vattr.ffi.mjs
var GT = /* @__PURE__ */ new Gt();
var LT = /* @__PURE__ */ new Lt();
var EQ = /* @__PURE__ */ new Eq();
function compare3(a2, b) {
  if (a2.name === b.name) {
    return EQ;
  } else if (a2.name < b.name) {
    return LT;
  } else {
    return GT;
  }
}

// build/dev/javascript/lustre/lustre/vdom/vattr.mjs
var Attribute = class extends CustomType {
  constructor(kind, name3, value2) {
    super();
    this.kind = kind;
    this.name = name3;
    this.value = value2;
  }
};
var Property = class extends CustomType {
  constructor(kind, name3, value2) {
    super();
    this.kind = kind;
    this.name = name3;
    this.value = value2;
  }
};
var Event2 = class extends CustomType {
  constructor(kind, name3, handler, include2, prevent_default, stop_propagation, immediate2, debounce, throttle) {
    super();
    this.kind = kind;
    this.name = name3;
    this.handler = handler;
    this.include = include2;
    this.prevent_default = prevent_default;
    this.stop_propagation = stop_propagation;
    this.immediate = immediate2;
    this.debounce = debounce;
    this.throttle = throttle;
  }
};
function merge(loop$attributes, loop$merged) {
  while (true) {
    let attributes = loop$attributes;
    let merged = loop$merged;
    if (attributes.hasLength(0)) {
      return merged;
    } else if (attributes.atLeastLength(1) && attributes.head instanceof Attribute && attributes.head.name === "") {
      let rest = attributes.tail;
      loop$attributes = rest;
      loop$merged = merged;
    } else if (attributes.atLeastLength(1) && attributes.head instanceof Attribute && attributes.head.name === "class" && attributes.head.value === "") {
      let rest = attributes.tail;
      loop$attributes = rest;
      loop$merged = merged;
    } else if (attributes.atLeastLength(1) && attributes.head instanceof Attribute && attributes.head.name === "style" && attributes.head.value === "") {
      let rest = attributes.tail;
      loop$attributes = rest;
      loop$merged = merged;
    } else if (attributes.atLeastLength(2) && attributes.head instanceof Attribute && attributes.head.name === "class" && attributes.tail.head instanceof Attribute && attributes.tail.head.name === "class") {
      let kind = attributes.head.kind;
      let class1 = attributes.head.value;
      let class2 = attributes.tail.head.value;
      let rest = attributes.tail.tail;
      let value2 = class1 + " " + class2;
      let attribute$1 = new Attribute(kind, "class", value2);
      loop$attributes = prepend(attribute$1, rest);
      loop$merged = merged;
    } else if (attributes.atLeastLength(2) && attributes.head instanceof Attribute && attributes.head.name === "style" && attributes.tail.head instanceof Attribute && attributes.tail.head.name === "style") {
      let kind = attributes.head.kind;
      let style1 = attributes.head.value;
      let style2 = attributes.tail.head.value;
      let rest = attributes.tail.tail;
      let value2 = style1 + ";" + style2;
      let attribute$1 = new Attribute(kind, "style", value2);
      loop$attributes = prepend(attribute$1, rest);
      loop$merged = merged;
    } else {
      let attribute$1 = attributes.head;
      let rest = attributes.tail;
      loop$attributes = rest;
      loop$merged = prepend(attribute$1, merged);
    }
  }
}
function prepare(attributes) {
  if (attributes.hasLength(0)) {
    return attributes;
  } else if (attributes.hasLength(1)) {
    return attributes;
  } else {
    let _pipe = attributes;
    let _pipe$1 = sort(_pipe, (a2, b) => {
      return compare3(b, a2);
    });
    return merge(_pipe$1, empty_list);
  }
}
var attribute_kind = 0;
function attribute(name3, value2) {
  return new Attribute(attribute_kind, name3, value2);
}
var property_kind = 1;
function property(name3, value2) {
  return new Property(property_kind, name3, value2);
}
var event_kind = 2;
function event(name3, handler, include2, prevent_default, stop_propagation, immediate2, debounce, throttle) {
  return new Event2(
    event_kind,
    name3,
    handler,
    include2,
    prevent_default,
    stop_propagation,
    immediate2,
    debounce,
    throttle
  );
}

// build/dev/javascript/lustre/lustre/attribute.mjs
function attribute2(name3, value2) {
  return attribute(name3, value2);
}
function property2(name3, value2) {
  return property(name3, value2);
}
function boolean_attribute(name3, value2) {
  if (value2) {
    return attribute2(name3, "");
  } else {
    return property2(name3, bool(false));
  }
}
function autofocus(should_autofocus) {
  return boolean_attribute("autofocus", should_autofocus);
}
function class$(name3) {
  return attribute2("class", name3);
}
function do_classes(loop$names, loop$class) {
  while (true) {
    let names = loop$names;
    let class$2 = loop$class;
    if (names.hasLength(0)) {
      return class$2;
    } else if (names.atLeastLength(1) && names.head[1]) {
      let name$1 = names.head[0];
      let rest = names.tail;
      return class$2 + name$1 + " " + do_classes(rest, class$2);
    } else {
      let rest = names.tail;
      loop$names = rest;
      loop$class = class$2;
    }
  }
}
function classes(names) {
  return class$(do_classes(names, ""));
}
function hidden(is_hidden) {
  return boolean_attribute("hidden", is_hidden);
}
function id(value2) {
  return attribute2("id", value2);
}
function popover(value2) {
  return attribute2("popover", value2);
}
function style(property3, value2) {
  if (property3 === "") {
    return class$("");
  } else if (value2 === "") {
    return class$("");
  } else {
    return attribute2("style", property3 + ":" + value2 + ";");
  }
}
function do_styles(loop$properties, loop$styles) {
  while (true) {
    let properties = loop$properties;
    let styles2 = loop$styles;
    if (properties.hasLength(0)) {
      return styles2;
    } else if (properties.atLeastLength(1) && properties.head[0] === "") {
      let rest = properties.tail;
      loop$properties = rest;
      loop$styles = styles2;
    } else if (properties.atLeastLength(1) && properties.head[1] === "") {
      let rest = properties.tail;
      loop$properties = rest;
      loop$styles = styles2;
    } else {
      let name$1 = properties.head[0];
      let value$1 = properties.head[1];
      let rest = properties.tail;
      loop$properties = rest;
      loop$styles = styles2 + name$1 + ":" + value$1 + ";";
    }
  }
}
function styles(properties) {
  return attribute2("style", do_styles(properties, ""));
}
function href(url) {
  return attribute2("href", url);
}
function autocomplete(value2) {
  return attribute2("autocomplete", value2);
}
function for$(id2) {
  return attribute2("for", id2);
}
function name(element_name) {
  return attribute2("name", element_name);
}
function popovertarget(id2) {
  return attribute2("popovertarget", id2);
}
function type_(control_type) {
  return attribute2("type", control_type);
}
function value(control_value) {
  return attribute2("value", control_value);
}

// build/dev/javascript/lustre/lustre/effect.mjs
var Effect = class extends CustomType {
  constructor(synchronous, before_paint2, after_paint2) {
    super();
    this.synchronous = synchronous;
    this.before_paint = before_paint2;
    this.after_paint = after_paint2;
  }
};
var empty = /* @__PURE__ */ new Effect(
  /* @__PURE__ */ toList([]),
  /* @__PURE__ */ toList([]),
  /* @__PURE__ */ toList([])
);
function none() {
  return empty;
}
function from(effect) {
  let task = (actions) => {
    let dispatch = actions.dispatch;
    return effect(dispatch);
  };
  let _record = empty;
  return new Effect(toList([task]), _record.before_paint, _record.after_paint);
}
function after_paint(effect) {
  let task = (actions) => {
    let root3 = actions.root();
    let dispatch = actions.dispatch;
    return effect(dispatch, root3);
  };
  let _record = empty;
  return new Effect(_record.synchronous, _record.before_paint, toList([task]));
}
function event2(name3, data) {
  let task = (actions) => {
    return actions.emit(name3, data);
  };
  let _record = empty;
  return new Effect(toList([task]), _record.before_paint, _record.after_paint);
}
function batch(effects) {
  return fold2(
    effects,
    empty,
    (acc, eff) => {
      return new Effect(
        fold2(eff.synchronous, acc.synchronous, prepend2),
        fold2(eff.before_paint, acc.before_paint, prepend2),
        fold2(eff.after_paint, acc.after_paint, prepend2)
      );
    }
  );
}

// build/dev/javascript/lustre/lustre/internals/mutable_map.ffi.mjs
function empty2() {
  return null;
}
function get(map5, key) {
  const value2 = map5?.get(key);
  if (value2 != null) {
    return new Ok(value2);
  } else {
    return new Error(void 0);
  }
}
function insert3(map5, key, value2) {
  map5 ??= /* @__PURE__ */ new Map();
  map5.set(key, value2);
  return map5;
}
function remove(map5, key) {
  map5?.delete(key);
  return map5;
}

// build/dev/javascript/lustre/lustre/vdom/path.mjs
var Root = class extends CustomType {
};
var Key = class extends CustomType {
  constructor(key, parent) {
    super();
    this.key = key;
    this.parent = parent;
  }
};
var Index = class extends CustomType {
  constructor(index4, parent) {
    super();
    this.index = index4;
    this.parent = parent;
  }
};
function do_matches(loop$path, loop$candidates) {
  while (true) {
    let path2 = loop$path;
    let candidates = loop$candidates;
    if (candidates.hasLength(0)) {
      return false;
    } else {
      let candidate = candidates.head;
      let rest = candidates.tail;
      let $ = starts_with(path2, candidate);
      if ($) {
        return true;
      } else {
        loop$path = path2;
        loop$candidates = rest;
      }
    }
  }
}
function add2(parent, index4, key) {
  if (key === "") {
    return new Index(index4, parent);
  } else {
    return new Key(key, parent);
  }
}
var root2 = /* @__PURE__ */ new Root();
var separator_index = "\n";
var separator_key = "	";
function do_to_string(loop$path, loop$acc) {
  while (true) {
    let path2 = loop$path;
    let acc = loop$acc;
    if (path2 instanceof Root) {
      if (acc.hasLength(0)) {
        return "";
      } else {
        let segments = acc.tail;
        return concat2(segments);
      }
    } else if (path2 instanceof Key) {
      let key = path2.key;
      let parent = path2.parent;
      loop$path = parent;
      loop$acc = prepend(separator_key, prepend(key, acc));
    } else {
      let index4 = path2.index;
      let parent = path2.parent;
      loop$path = parent;
      loop$acc = prepend(
        separator_index,
        prepend(to_string(index4), acc)
      );
    }
  }
}
function to_string2(path2) {
  return do_to_string(path2, toList([]));
}
function matches(path2, candidates) {
  if (candidates.hasLength(0)) {
    return false;
  } else {
    return do_matches(to_string2(path2), candidates);
  }
}
var separator_event = "\f";
function event3(path2, event4) {
  return do_to_string(path2, toList([separator_event, event4]));
}

// build/dev/javascript/lustre/lustre/vdom/vnode.mjs
var Fragment = class extends CustomType {
  constructor(kind, key, mapper, children, keyed_children, children_count) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.children = children;
    this.keyed_children = keyed_children;
    this.children_count = children_count;
  }
};
var Element = class extends CustomType {
  constructor(kind, key, mapper, namespace2, tag, attributes, children, keyed_children, self_closing, void$) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.namespace = namespace2;
    this.tag = tag;
    this.attributes = attributes;
    this.children = children;
    this.keyed_children = keyed_children;
    this.self_closing = self_closing;
    this.void = void$;
  }
};
var Text = class extends CustomType {
  constructor(kind, key, mapper, content) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.content = content;
  }
};
var UnsafeInnerHtml = class extends CustomType {
  constructor(kind, key, mapper, namespace2, tag, attributes, inner_html) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.namespace = namespace2;
    this.tag = tag;
    this.attributes = attributes;
    this.inner_html = inner_html;
  }
};
function is_void_element(tag, namespace2) {
  if (namespace2 === "") {
    if (tag === "area") {
      return true;
    } else if (tag === "base") {
      return true;
    } else if (tag === "br") {
      return true;
    } else if (tag === "col") {
      return true;
    } else if (tag === "embed") {
      return true;
    } else if (tag === "hr") {
      return true;
    } else if (tag === "img") {
      return true;
    } else if (tag === "input") {
      return true;
    } else if (tag === "link") {
      return true;
    } else if (tag === "meta") {
      return true;
    } else if (tag === "param") {
      return true;
    } else if (tag === "source") {
      return true;
    } else if (tag === "track") {
      return true;
    } else if (tag === "wbr") {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}
function advance(node) {
  if (node instanceof Fragment) {
    let children_count = node.children_count;
    return 1 + children_count;
  } else {
    return 1;
  }
}
var fragment_kind = 0;
function fragment(key, mapper, children, keyed_children, children_count) {
  return new Fragment(
    fragment_kind,
    key,
    mapper,
    children,
    keyed_children,
    children_count
  );
}
var element_kind = 1;
function element(key, mapper, namespace2, tag, attributes, children, keyed_children, self_closing, void$) {
  return new Element(
    element_kind,
    key,
    mapper,
    namespace2,
    tag,
    prepare(attributes),
    children,
    keyed_children,
    self_closing,
    void$ || is_void_element(tag, namespace2)
  );
}
var text_kind = 2;
function text(key, mapper, content) {
  return new Text(text_kind, key, mapper, content);
}
var unsafe_inner_html_kind = 3;
function set_fragment_key(loop$key, loop$children, loop$index, loop$new_children, loop$keyed_children) {
  while (true) {
    let key = loop$key;
    let children = loop$children;
    let index4 = loop$index;
    let new_children = loop$new_children;
    let keyed_children = loop$keyed_children;
    if (children.hasLength(0)) {
      return [reverse(new_children), keyed_children];
    } else if (children.atLeastLength(1) && children.head instanceof Fragment && children.head.key === "") {
      let node = children.head;
      let children$1 = children.tail;
      let child_key = key + "::" + to_string(index4);
      let $ = set_fragment_key(
        child_key,
        node.children,
        0,
        empty_list,
        empty2()
      );
      let node_children = $[0];
      let node_keyed_children = $[1];
      let _block;
      let _record = node;
      _block = new Fragment(
        _record.kind,
        _record.key,
        _record.mapper,
        node_children,
        node_keyed_children,
        _record.children_count
      );
      let new_node = _block;
      let new_children$1 = prepend(new_node, new_children);
      let index$1 = index4 + 1;
      loop$key = key;
      loop$children = children$1;
      loop$index = index$1;
      loop$new_children = new_children$1;
      loop$keyed_children = keyed_children;
    } else if (children.atLeastLength(1) && children.head.key !== "") {
      let node = children.head;
      let children$1 = children.tail;
      let child_key = key + "::" + node.key;
      let keyed_node = to_keyed(child_key, node);
      let new_children$1 = prepend(keyed_node, new_children);
      let keyed_children$1 = insert3(
        keyed_children,
        child_key,
        keyed_node
      );
      let index$1 = index4 + 1;
      loop$key = key;
      loop$children = children$1;
      loop$index = index$1;
      loop$new_children = new_children$1;
      loop$keyed_children = keyed_children$1;
    } else {
      let node = children.head;
      let children$1 = children.tail;
      let new_children$1 = prepend(node, new_children);
      let index$1 = index4 + 1;
      loop$key = key;
      loop$children = children$1;
      loop$index = index$1;
      loop$new_children = new_children$1;
      loop$keyed_children = keyed_children;
    }
  }
}
function to_keyed(key, node) {
  if (node instanceof Element) {
    let _record = node;
    return new Element(
      _record.kind,
      key,
      _record.mapper,
      _record.namespace,
      _record.tag,
      _record.attributes,
      _record.children,
      _record.keyed_children,
      _record.self_closing,
      _record.void
    );
  } else if (node instanceof Text) {
    let _record = node;
    return new Text(_record.kind, key, _record.mapper, _record.content);
  } else if (node instanceof UnsafeInnerHtml) {
    let _record = node;
    return new UnsafeInnerHtml(
      _record.kind,
      key,
      _record.mapper,
      _record.namespace,
      _record.tag,
      _record.attributes,
      _record.inner_html
    );
  } else {
    let children = node.children;
    let $ = set_fragment_key(
      key,
      children,
      0,
      empty_list,
      empty2()
    );
    let children$1 = $[0];
    let keyed_children = $[1];
    let _record = node;
    return new Fragment(
      _record.kind,
      key,
      _record.mapper,
      children$1,
      keyed_children,
      _record.children_count
    );
  }
}

// build/dev/javascript/lustre/lustre/vdom/patch.mjs
var Patch = class extends CustomType {
  constructor(index4, removed, changes, children) {
    super();
    this.index = index4;
    this.removed = removed;
    this.changes = changes;
    this.children = children;
  }
};
var ReplaceText = class extends CustomType {
  constructor(kind, content) {
    super();
    this.kind = kind;
    this.content = content;
  }
};
var ReplaceInnerHtml = class extends CustomType {
  constructor(kind, inner_html) {
    super();
    this.kind = kind;
    this.inner_html = inner_html;
  }
};
var Update = class extends CustomType {
  constructor(kind, added, removed) {
    super();
    this.kind = kind;
    this.added = added;
    this.removed = removed;
  }
};
var Move = class extends CustomType {
  constructor(kind, key, before, count) {
    super();
    this.kind = kind;
    this.key = key;
    this.before = before;
    this.count = count;
  }
};
var RemoveKey = class extends CustomType {
  constructor(kind, key, count) {
    super();
    this.kind = kind;
    this.key = key;
    this.count = count;
  }
};
var Replace = class extends CustomType {
  constructor(kind, from2, count, with$) {
    super();
    this.kind = kind;
    this.from = from2;
    this.count = count;
    this.with = with$;
  }
};
var Insert = class extends CustomType {
  constructor(kind, children, before) {
    super();
    this.kind = kind;
    this.children = children;
    this.before = before;
  }
};
var Remove = class extends CustomType {
  constructor(kind, from2, count) {
    super();
    this.kind = kind;
    this.from = from2;
    this.count = count;
  }
};
function new$4(index4, removed, changes, children) {
  return new Patch(index4, removed, changes, children);
}
var replace_text_kind = 0;
function replace_text(content) {
  return new ReplaceText(replace_text_kind, content);
}
var replace_inner_html_kind = 1;
function replace_inner_html(inner_html) {
  return new ReplaceInnerHtml(replace_inner_html_kind, inner_html);
}
var update_kind = 2;
function update(added, removed) {
  return new Update(update_kind, added, removed);
}
var move_kind = 3;
function move(key, before, count) {
  return new Move(move_kind, key, before, count);
}
var remove_key_kind = 4;
function remove_key(key, count) {
  return new RemoveKey(remove_key_kind, key, count);
}
var replace_kind = 5;
function replace2(from2, count, with$) {
  return new Replace(replace_kind, from2, count, with$);
}
var insert_kind = 6;
function insert4(children, before) {
  return new Insert(insert_kind, children, before);
}
var remove_kind = 7;
function remove2(from2, count) {
  return new Remove(remove_kind, from2, count);
}

// build/dev/javascript/lustre/lustre/vdom/diff.mjs
var Diff = class extends CustomType {
  constructor(patch, events) {
    super();
    this.patch = patch;
    this.events = events;
  }
};
var AttributeChange = class extends CustomType {
  constructor(added, removed, events) {
    super();
    this.added = added;
    this.removed = removed;
    this.events = events;
  }
};
function is_controlled(events, namespace2, tag, path2) {
  if (tag === "input" && namespace2 === "") {
    return has_dispatched_events(events, path2);
  } else if (tag === "select" && namespace2 === "") {
    return has_dispatched_events(events, path2);
  } else if (tag === "textarea" && namespace2 === "") {
    return has_dispatched_events(events, path2);
  } else {
    return false;
  }
}
function diff_attributes(loop$controlled, loop$path, loop$mapper, loop$events, loop$old, loop$new, loop$added, loop$removed) {
  while (true) {
    let controlled = loop$controlled;
    let path2 = loop$path;
    let mapper = loop$mapper;
    let events = loop$events;
    let old = loop$old;
    let new$8 = loop$new;
    let added = loop$added;
    let removed = loop$removed;
    if (old.hasLength(0) && new$8.hasLength(0)) {
      return new AttributeChange(added, removed, events);
    } else if (old.atLeastLength(1) && old.head instanceof Event2 && new$8.hasLength(0)) {
      let prev = old.head;
      let name3 = old.head.name;
      let old$1 = old.tail;
      let removed$1 = prepend(prev, removed);
      let events$1 = remove_event(events, path2, name3);
      loop$controlled = controlled;
      loop$path = path2;
      loop$mapper = mapper;
      loop$events = events$1;
      loop$old = old$1;
      loop$new = new$8;
      loop$added = added;
      loop$removed = removed$1;
    } else if (old.atLeastLength(1) && new$8.hasLength(0)) {
      let prev = old.head;
      let old$1 = old.tail;
      let removed$1 = prepend(prev, removed);
      loop$controlled = controlled;
      loop$path = path2;
      loop$mapper = mapper;
      loop$events = events;
      loop$old = old$1;
      loop$new = new$8;
      loop$added = added;
      loop$removed = removed$1;
    } else if (old.hasLength(0) && new$8.atLeastLength(1) && new$8.head instanceof Event2) {
      let next = new$8.head;
      let name3 = new$8.head.name;
      let handler = new$8.head.handler;
      let new$1 = new$8.tail;
      let added$1 = prepend(next, added);
      let events$1 = add_event(events, mapper, path2, name3, handler);
      loop$controlled = controlled;
      loop$path = path2;
      loop$mapper = mapper;
      loop$events = events$1;
      loop$old = old;
      loop$new = new$1;
      loop$added = added$1;
      loop$removed = removed;
    } else if (old.hasLength(0) && new$8.atLeastLength(1)) {
      let next = new$8.head;
      let new$1 = new$8.tail;
      let added$1 = prepend(next, added);
      loop$controlled = controlled;
      loop$path = path2;
      loop$mapper = mapper;
      loop$events = events;
      loop$old = old;
      loop$new = new$1;
      loop$added = added$1;
      loop$removed = removed;
    } else {
      let prev = old.head;
      let remaining_old = old.tail;
      let next = new$8.head;
      let remaining_new = new$8.tail;
      let $ = compare3(prev, next);
      if (prev instanceof Attribute && $ instanceof Eq && next instanceof Attribute) {
        let _block;
        let $1 = next.name;
        if ($1 === "value") {
          _block = controlled || prev.value !== next.value;
        } else if ($1 === "checked") {
          _block = controlled || prev.value !== next.value;
        } else if ($1 === "selected") {
          _block = controlled || prev.value !== next.value;
        } else {
          _block = prev.value !== next.value;
        }
        let has_changes = _block;
        let _block$1;
        if (has_changes) {
          _block$1 = prepend(next, added);
        } else {
          _block$1 = added;
        }
        let added$1 = _block$1;
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if (prev instanceof Property && $ instanceof Eq && next instanceof Property) {
        let _block;
        let $1 = next.name;
        if ($1 === "scrollLeft") {
          _block = true;
        } else if ($1 === "scrollRight") {
          _block = true;
        } else if ($1 === "value") {
          _block = controlled || !isEqual(prev.value, next.value);
        } else if ($1 === "checked") {
          _block = controlled || !isEqual(prev.value, next.value);
        } else if ($1 === "selected") {
          _block = controlled || !isEqual(prev.value, next.value);
        } else {
          _block = !isEqual(prev.value, next.value);
        }
        let has_changes = _block;
        let _block$1;
        if (has_changes) {
          _block$1 = prepend(next, added);
        } else {
          _block$1 = added;
        }
        let added$1 = _block$1;
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if (prev instanceof Event2 && $ instanceof Eq && next instanceof Event2) {
        let name3 = next.name;
        let handler = next.handler;
        let has_changes = prev.prevent_default !== next.prevent_default || prev.stop_propagation !== next.stop_propagation || prev.immediate !== next.immediate || prev.debounce !== next.debounce || prev.throttle !== next.throttle;
        let _block;
        if (has_changes) {
          _block = prepend(next, added);
        } else {
          _block = added;
        }
        let added$1 = _block;
        let events$1 = add_event(events, mapper, path2, name3, handler);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if (prev instanceof Event2 && $ instanceof Eq) {
        let name3 = prev.name;
        let added$1 = prepend(next, added);
        let removed$1 = prepend(prev, removed);
        let events$1 = remove_event(events, path2, name3);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed$1;
      } else if ($ instanceof Eq && next instanceof Event2) {
        let name3 = next.name;
        let handler = next.handler;
        let added$1 = prepend(next, added);
        let removed$1 = prepend(prev, removed);
        let events$1 = add_event(events, mapper, path2, name3, handler);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed$1;
      } else if ($ instanceof Eq) {
        let added$1 = prepend(next, added);
        let removed$1 = prepend(prev, removed);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed$1;
      } else if ($ instanceof Gt && next instanceof Event2) {
        let name3 = next.name;
        let handler = next.handler;
        let added$1 = prepend(next, added);
        let events$1 = add_event(events, mapper, path2, name3, handler);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if ($ instanceof Gt) {
        let added$1 = prepend(next, added);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if (prev instanceof Event2 && $ instanceof Lt) {
        let name3 = prev.name;
        let removed$1 = prepend(prev, removed);
        let events$1 = remove_event(events, path2, name3);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = remaining_old;
        loop$new = new$8;
        loop$added = added;
        loop$removed = removed$1;
      } else {
        let removed$1 = prepend(prev, removed);
        loop$controlled = controlled;
        loop$path = path2;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = remaining_old;
        loop$new = new$8;
        loop$added = added;
        loop$removed = removed$1;
      }
    }
  }
}
function do_diff(loop$old, loop$old_keyed, loop$new, loop$new_keyed, loop$moved, loop$moved_offset, loop$removed, loop$node_index, loop$patch_index, loop$path, loop$changes, loop$children, loop$mapper, loop$events) {
  while (true) {
    let old = loop$old;
    let old_keyed = loop$old_keyed;
    let new$8 = loop$new;
    let new_keyed = loop$new_keyed;
    let moved = loop$moved;
    let moved_offset = loop$moved_offset;
    let removed = loop$removed;
    let node_index = loop$node_index;
    let patch_index = loop$patch_index;
    let path2 = loop$path;
    let changes = loop$changes;
    let children = loop$children;
    let mapper = loop$mapper;
    let events = loop$events;
    if (old.hasLength(0) && new$8.hasLength(0)) {
      return new Diff(
        new Patch(patch_index, removed, changes, children),
        events
      );
    } else if (old.atLeastLength(1) && new$8.hasLength(0)) {
      let prev = old.head;
      let old$1 = old.tail;
      let _block;
      let $ = prev.key === "" || !contains(moved, prev.key);
      if ($) {
        _block = removed + advance(prev);
      } else {
        _block = removed;
      }
      let removed$1 = _block;
      let events$1 = remove_child(events, path2, node_index, prev);
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$8;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed$1;
      loop$node_index = node_index;
      loop$patch_index = patch_index;
      loop$path = path2;
      loop$changes = changes;
      loop$children = children;
      loop$mapper = mapper;
      loop$events = events$1;
    } else if (old.hasLength(0) && new$8.atLeastLength(1)) {
      let events$1 = add_children(
        events,
        mapper,
        path2,
        node_index,
        new$8
      );
      let insert5 = insert4(new$8, node_index - moved_offset);
      let changes$1 = prepend(insert5, changes);
      return new Diff(
        new Patch(patch_index, removed, changes$1, children),
        events$1
      );
    } else if (old.atLeastLength(1) && new$8.atLeastLength(1) && old.head.key !== new$8.head.key) {
      let prev = old.head;
      let old_remaining = old.tail;
      let next = new$8.head;
      let new_remaining = new$8.tail;
      let next_did_exist = get(old_keyed, next.key);
      let prev_does_exist = get(new_keyed, prev.key);
      let prev_has_moved = contains(moved, prev.key);
      if (prev_does_exist.isOk() && next_did_exist.isOk() && prev_has_moved) {
        loop$old = old_remaining;
        loop$old_keyed = old_keyed;
        loop$new = new$8;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset - advance(prev);
        loop$removed = removed;
        loop$node_index = node_index;
        loop$patch_index = patch_index;
        loop$path = path2;
        loop$changes = changes;
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events;
      } else if (prev_does_exist.isOk() && next_did_exist.isOk()) {
        let match = next_did_exist[0];
        let count = advance(next);
        let before = node_index - moved_offset;
        let move2 = move(next.key, before, count);
        let changes$1 = prepend(move2, changes);
        let moved$1 = insert2(moved, next.key);
        let moved_offset$1 = moved_offset + count;
        loop$old = prepend(match, old);
        loop$old_keyed = old_keyed;
        loop$new = new$8;
        loop$new_keyed = new_keyed;
        loop$moved = moved$1;
        loop$moved_offset = moved_offset$1;
        loop$removed = removed;
        loop$node_index = node_index;
        loop$patch_index = patch_index;
        loop$path = path2;
        loop$changes = changes$1;
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events;
      } else if (!prev_does_exist.isOk() && next_did_exist.isOk()) {
        let count = advance(prev);
        let moved_offset$1 = moved_offset - count;
        let events$1 = remove_child(events, path2, node_index, prev);
        let remove3 = remove_key(prev.key, count);
        let changes$1 = prepend(remove3, changes);
        loop$old = old_remaining;
        loop$old_keyed = old_keyed;
        loop$new = new$8;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset$1;
        loop$removed = removed;
        loop$node_index = node_index;
        loop$patch_index = patch_index;
        loop$path = path2;
        loop$changes = changes$1;
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events$1;
      } else if (prev_does_exist.isOk() && !next_did_exist.isOk()) {
        let before = node_index - moved_offset;
        let count = advance(next);
        let events$1 = add_child(events, mapper, path2, node_index, next);
        let insert5 = insert4(toList([next]), before);
        let changes$1 = prepend(insert5, changes);
        loop$old = old;
        loop$old_keyed = old_keyed;
        loop$new = new_remaining;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset + count;
        loop$removed = removed;
        loop$node_index = node_index + count;
        loop$patch_index = patch_index;
        loop$path = path2;
        loop$changes = changes$1;
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events$1;
      } else {
        let prev_count = advance(prev);
        let next_count = advance(next);
        let change = replace2(node_index - moved_offset, prev_count, next);
        let _block;
        let _pipe = events;
        let _pipe$1 = remove_child(_pipe, path2, node_index, prev);
        _block = add_child(_pipe$1, mapper, path2, node_index, next);
        let events$1 = _block;
        loop$old = old_remaining;
        loop$old_keyed = old_keyed;
        loop$new = new_remaining;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset - prev_count + next_count;
        loop$removed = removed;
        loop$node_index = node_index + next_count;
        loop$patch_index = patch_index;
        loop$path = path2;
        loop$changes = prepend(change, changes);
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events$1;
      }
    } else if (old.atLeastLength(1) && old.head instanceof Fragment && new$8.atLeastLength(1) && new$8.head instanceof Fragment) {
      let prev = old.head;
      let old$1 = old.tail;
      let next = new$8.head;
      let new$1 = new$8.tail;
      let node_index$1 = node_index + 1;
      let prev_count = prev.children_count;
      let next_count = next.children_count;
      let composed_mapper = compose_mapper(mapper, next.mapper);
      let child = do_diff(
        prev.children,
        prev.keyed_children,
        next.children,
        next.keyed_children,
        empty_set(),
        moved_offset,
        0,
        node_index$1,
        -1,
        path2,
        empty_list,
        children,
        composed_mapper,
        events
      );
      let _block;
      let $ = child.patch.removed > 0;
      if ($) {
        let remove_from = node_index$1 + next_count - moved_offset;
        let patch = remove2(remove_from, child.patch.removed);
        _block = append(child.patch.changes, prepend(patch, changes));
      } else {
        _block = append(child.patch.changes, changes);
      }
      let changes$1 = _block;
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset + next_count - prev_count;
      loop$removed = removed;
      loop$node_index = node_index$1 + next_count;
      loop$patch_index = patch_index;
      loop$path = path2;
      loop$changes = changes$1;
      loop$children = child.patch.children;
      loop$mapper = mapper;
      loop$events = child.events;
    } else if (old.atLeastLength(1) && old.head instanceof Element && new$8.atLeastLength(1) && new$8.head instanceof Element && (old.head.namespace === new$8.head.namespace && old.head.tag === new$8.head.tag)) {
      let prev = old.head;
      let old$1 = old.tail;
      let next = new$8.head;
      let new$1 = new$8.tail;
      let composed_mapper = compose_mapper(mapper, next.mapper);
      let child_path = add2(path2, node_index, next.key);
      let controlled = is_controlled(
        events,
        next.namespace,
        next.tag,
        child_path
      );
      let $ = diff_attributes(
        controlled,
        child_path,
        composed_mapper,
        events,
        prev.attributes,
        next.attributes,
        empty_list,
        empty_list
      );
      let added_attrs = $.added;
      let removed_attrs = $.removed;
      let events$1 = $.events;
      let _block;
      if (added_attrs.hasLength(0) && removed_attrs.hasLength(0)) {
        _block = empty_list;
      } else {
        _block = toList([update(added_attrs, removed_attrs)]);
      }
      let initial_child_changes = _block;
      let child = do_diff(
        prev.children,
        prev.keyed_children,
        next.children,
        next.keyed_children,
        empty_set(),
        0,
        0,
        0,
        node_index,
        child_path,
        initial_child_changes,
        empty_list,
        composed_mapper,
        events$1
      );
      let _block$1;
      let $1 = child.patch;
      if ($1 instanceof Patch && $1.removed === 0 && $1.changes.hasLength(0) && $1.children.hasLength(0)) {
        _block$1 = children;
      } else {
        _block$1 = prepend(child.patch, children);
      }
      let children$1 = _block$1;
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed;
      loop$node_index = node_index + 1;
      loop$patch_index = patch_index;
      loop$path = path2;
      loop$changes = changes;
      loop$children = children$1;
      loop$mapper = mapper;
      loop$events = child.events;
    } else if (old.atLeastLength(1) && old.head instanceof Text && new$8.atLeastLength(1) && new$8.head instanceof Text && old.head.content === new$8.head.content) {
      let prev = old.head;
      let old$1 = old.tail;
      let next = new$8.head;
      let new$1 = new$8.tail;
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed;
      loop$node_index = node_index + 1;
      loop$patch_index = patch_index;
      loop$path = path2;
      loop$changes = changes;
      loop$children = children;
      loop$mapper = mapper;
      loop$events = events;
    } else if (old.atLeastLength(1) && old.head instanceof Text && new$8.atLeastLength(1) && new$8.head instanceof Text) {
      let old$1 = old.tail;
      let next = new$8.head;
      let new$1 = new$8.tail;
      let child = new$4(
        node_index,
        0,
        toList([replace_text(next.content)]),
        empty_list
      );
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed;
      loop$node_index = node_index + 1;
      loop$patch_index = patch_index;
      loop$path = path2;
      loop$changes = changes;
      loop$children = prepend(child, children);
      loop$mapper = mapper;
      loop$events = events;
    } else if (old.atLeastLength(1) && old.head instanceof UnsafeInnerHtml && new$8.atLeastLength(1) && new$8.head instanceof UnsafeInnerHtml) {
      let prev = old.head;
      let old$1 = old.tail;
      let next = new$8.head;
      let new$1 = new$8.tail;
      let composed_mapper = compose_mapper(mapper, next.mapper);
      let child_path = add2(path2, node_index, next.key);
      let $ = diff_attributes(
        false,
        child_path,
        composed_mapper,
        events,
        prev.attributes,
        next.attributes,
        empty_list,
        empty_list
      );
      let added_attrs = $.added;
      let removed_attrs = $.removed;
      let events$1 = $.events;
      let _block;
      if (added_attrs.hasLength(0) && removed_attrs.hasLength(0)) {
        _block = empty_list;
      } else {
        _block = toList([update(added_attrs, removed_attrs)]);
      }
      let child_changes = _block;
      let _block$1;
      let $1 = prev.inner_html === next.inner_html;
      if ($1) {
        _block$1 = child_changes;
      } else {
        _block$1 = prepend(
          replace_inner_html(next.inner_html),
          child_changes
        );
      }
      let child_changes$1 = _block$1;
      let _block$2;
      if (child_changes$1.hasLength(0)) {
        _block$2 = children;
      } else {
        _block$2 = prepend(
          new$4(node_index, 0, child_changes$1, toList([])),
          children
        );
      }
      let children$1 = _block$2;
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed;
      loop$node_index = node_index + 1;
      loop$patch_index = patch_index;
      loop$path = path2;
      loop$changes = changes;
      loop$children = children$1;
      loop$mapper = mapper;
      loop$events = events$1;
    } else {
      let prev = old.head;
      let old_remaining = old.tail;
      let next = new$8.head;
      let new_remaining = new$8.tail;
      let prev_count = advance(prev);
      let next_count = advance(next);
      let change = replace2(node_index - moved_offset, prev_count, next);
      let _block;
      let _pipe = events;
      let _pipe$1 = remove_child(_pipe, path2, node_index, prev);
      _block = add_child(_pipe$1, mapper, path2, node_index, next);
      let events$1 = _block;
      loop$old = old_remaining;
      loop$old_keyed = old_keyed;
      loop$new = new_remaining;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset - prev_count + next_count;
      loop$removed = removed;
      loop$node_index = node_index + next_count;
      loop$patch_index = patch_index;
      loop$path = path2;
      loop$changes = prepend(change, changes);
      loop$children = children;
      loop$mapper = mapper;
      loop$events = events$1;
    }
  }
}
function diff(events, old, new$8) {
  return do_diff(
    toList([old]),
    empty2(),
    toList([new$8]),
    empty2(),
    empty_set(),
    0,
    0,
    0,
    0,
    root2,
    empty_list,
    empty_list,
    identity2,
    tick(events)
  );
}

// build/dev/javascript/lustre/lustre/vdom/reconciler.ffi.mjs
var Reconciler = class {
  offset = 0;
  #root = null;
  #dispatch = () => {
  };
  #useServerEvents = false;
  constructor(root3, dispatch, { useServerEvents = false } = {}) {
    this.#root = root3;
    this.#dispatch = dispatch;
    this.#useServerEvents = useServerEvents;
  }
  mount(vdom) {
    appendChild(this.#root, this.#createChild(this.#root, vdom));
  }
  #stack = [];
  push(patch) {
    const offset = this.offset;
    if (offset) {
      iterate(patch.changes, (change) => {
        switch (change.kind) {
          case insert_kind:
          case move_kind:
            change.before = (change.before | 0) + offset;
            break;
          case remove_kind:
          case replace_kind:
            change.from = (change.from | 0) + offset;
            break;
        }
      });
      iterate(patch.children, (child) => {
        child.index = (child.index | 0) + offset;
      });
    }
    this.#stack.push({ node: this.#root, patch });
    this.#reconcile();
  }
  // PATCHING ------------------------------------------------------------------
  #reconcile() {
    const self = this;
    while (self.#stack.length) {
      const { node, patch } = self.#stack.pop();
      iterate(patch.changes, (change) => {
        switch (change.kind) {
          case insert_kind:
            self.#insert(node, change.children, change.before);
            break;
          case move_kind:
            self.#move(node, change.key, change.before, change.count);
            break;
          case remove_key_kind:
            self.#removeKey(node, change.key, change.count);
            break;
          case remove_kind:
            self.#remove(node, change.from, change.count);
            break;
          case replace_kind:
            self.#replace(node, change.from, change.count, change.with);
            break;
          case replace_text_kind:
            self.#replaceText(node, change.content);
            break;
          case replace_inner_html_kind:
            self.#replaceInnerHtml(node, change.inner_html);
            break;
          case update_kind:
            self.#update(node, change.added, change.removed);
            break;
        }
      });
      if (patch.removed) {
        self.#remove(
          node,
          node.childNodes.length - patch.removed,
          patch.removed
        );
      }
      let lastIndex = -1;
      let lastChild = null;
      iterate(patch.children, (child) => {
        const index4 = child.index | 0;
        const next = lastChild && lastIndex - index4 === 1 ? lastChild.previousSibling : childAt(node, index4);
        self.#stack.push({ node: next, patch: child });
        lastChild = next;
        lastIndex = index4;
      });
    }
  }
  // CHANGES -------------------------------------------------------------------
  #insert(node, children, before) {
    const fragment3 = createDocumentFragment();
    iterate(children, (child) => {
      const el = this.#createChild(node, child);
      appendChild(fragment3, el);
    });
    insertBefore(node, fragment3, childAt(node, before));
  }
  #move(node, key, before, count) {
    let el = getKeyedChild(node, key);
    const beforeEl = childAt(node, before);
    for (let i = 0; i < count && el !== null; ++i) {
      const next = el.nextSibling;
      if (SUPPORTS_MOVE_BEFORE) {
        node.moveBefore(el, beforeEl);
      } else {
        insertBefore(node, el, beforeEl);
      }
      el = next;
    }
  }
  #removeKey(node, key, count) {
    this.#removeFromChild(node, getKeyedChild(node, key), count);
  }
  #remove(node, from2, count) {
    this.#removeFromChild(node, childAt(node, from2), count);
  }
  #removeFromChild(parent, child, count) {
    while (count-- > 0 && child !== null) {
      const next = child.nextSibling;
      const key = child[meta].key;
      if (key) {
        parent[meta].keyedChildren.delete(key);
      }
      for (const [_, { timeout }] of child[meta].debouncers ?? []) {
        clearTimeout(timeout);
      }
      parent.removeChild(child);
      child = next;
    }
  }
  #replace(parent, from2, count, child) {
    this.#remove(parent, from2, count);
    const el = this.#createChild(parent, child);
    insertBefore(parent, el, childAt(parent, from2));
  }
  #replaceText(node, content) {
    node.data = content ?? "";
  }
  #replaceInnerHtml(node, inner_html) {
    node.innerHTML = inner_html ?? "";
  }
  #update(node, added, removed) {
    iterate(removed, (attribute3) => {
      const name3 = attribute3.name;
      if (node[meta].handlers.has(name3)) {
        node.removeEventListener(name3, handleEvent);
        node[meta].handlers.delete(name3);
        if (node[meta].throttles.has(name3)) {
          node[meta].throttles.delete(name3);
        }
        if (node[meta].debouncers.has(name3)) {
          clearTimeout(node[meta].debouncers.get(name3).timeout);
          node[meta].debouncers.delete(name3);
        }
      } else {
        node.removeAttribute(name3);
        SYNCED_ATTRIBUTES[name3]?.removed?.(node, name3);
      }
    });
    iterate(added, (attribute3) => {
      this.#createAttribute(node, attribute3);
    });
  }
  // CONSTRUCTORS --------------------------------------------------------------
  #createChild(parent, vnode) {
    switch (vnode.kind) {
      case element_kind: {
        const node = createChildElement(parent, vnode);
        this.#createAttributes(node, vnode);
        this.#insert(node, vnode.children, 0);
        return node;
      }
      case text_kind: {
        return createChildText(parent, vnode);
      }
      case fragment_kind: {
        const node = createDocumentFragment();
        const head = createChildText(parent, vnode);
        appendChild(node, head);
        iterate(vnode.children, (child) => {
          appendChild(node, this.#createChild(parent, child));
        });
        return node;
      }
      case unsafe_inner_html_kind: {
        const node = createChildElement(parent, vnode);
        this.#createAttributes(node, vnode);
        this.#replaceInnerHtml(node, vnode.inner_html);
        return node;
      }
    }
  }
  #createAttributes(node, { attributes }) {
    iterate(attributes, (attribute3) => this.#createAttribute(node, attribute3));
  }
  #createAttribute(node, attribute3) {
    const { debouncers, handlers, throttles } = node[meta];
    const {
      kind,
      name: name3,
      value: value2,
      prevent_default: prevent,
      stop_propagation: stop,
      immediate: immediate2,
      include: include2,
      debounce: debounceDelay,
      throttle: throttleDelay
    } = attribute3;
    switch (kind) {
      case attribute_kind: {
        const valueOrDefault = value2 ?? "";
        if (name3 === "virtual:defaultValue") {
          node.defaultValue = valueOrDefault;
          return;
        }
        if (valueOrDefault !== node.getAttribute(name3)) {
          node.setAttribute(name3, valueOrDefault);
        }
        SYNCED_ATTRIBUTES[name3]?.added?.(node, value2);
        break;
      }
      case property_kind:
        node[name3] = value2;
        break;
      case event_kind: {
        if (!handlers.has(name3)) {
          node.addEventListener(name3, handleEvent, {
            passive: !attribute3.prevent_default
          });
        }
        if (throttleDelay > 0) {
          const throttle = throttles.get(name3) ?? {};
          throttle.delay = throttleDelay;
          throttles.set(name3, throttle);
        } else {
          throttles.delete(name3);
        }
        if (debounceDelay > 0) {
          const debounce = debouncers.get(name3) ?? {};
          debounce.delay = debounceDelay;
          debouncers.set(name3, debounce);
        } else {
          clearTimeout(debouncers.get(name3)?.timeout);
          debouncers.delete(name3);
        }
        handlers.set(name3, (event4) => {
          if (prevent) event4.preventDefault();
          if (stop) event4.stopPropagation();
          const type = event4.type;
          let path2 = "";
          let pathNode = event4.currentTarget;
          while (pathNode !== this.#root) {
            const key = pathNode[meta].key;
            const parent = pathNode.parentNode;
            if (key) {
              path2 = `${separator_key}${key}${path2}`;
            } else {
              const siblings = parent.childNodes;
              let index4 = [].indexOf.call(siblings, pathNode);
              if (parent === this.#root) {
                index4 -= this.offset;
              }
              path2 = `${separator_index}${index4}${path2}`;
            }
            pathNode = parent;
          }
          path2 = path2.slice(1);
          const data = this.#useServerEvents ? createServerEvent(event4, include2 ?? []) : event4;
          const throttle = throttles.get(type);
          if (throttle) {
            const now = Date.now();
            const last2 = throttle.last || 0;
            if (now > last2 + throttle.delay) {
              throttle.last = now;
              throttle.lastEvent = event4;
              this.#dispatch(data, path2, type, immediate2);
            } else {
              event4.preventDefault();
            }
          }
          const debounce = debouncers.get(type);
          if (debounce) {
            clearTimeout(debounce.timeout);
            debounce.timeout = setTimeout(() => {
              if (event4 === throttles.get(type)?.lastEvent) return;
              this.#dispatch(data, path2, type, immediate2);
            }, debounce.delay);
          } else {
            this.#dispatch(data, path2, type, immediate2);
          }
        });
        break;
      }
    }
  }
};
var iterate = (list4, callback) => {
  if (Array.isArray(list4)) {
    for (let i = 0; i < list4.length; i++) {
      callback(list4[i]);
    }
  } else if (list4) {
    for (list4; list4.tail; list4 = list4.tail) {
      callback(list4.head);
    }
  }
};
var appendChild = (node, child) => node.appendChild(child);
var insertBefore = (parent, node, referenceNode) => parent.insertBefore(node, referenceNode ?? null);
var createChildElement = (parent, { key, tag, namespace: namespace2 }) => {
  const node = document2.createElementNS(namespace2 || NAMESPACE_HTML, tag);
  initialiseMetadata(parent, node, key);
  return node;
};
var createChildText = (parent, { key, content }) => {
  const node = document2.createTextNode(content ?? "");
  initialiseMetadata(parent, node, key);
  return node;
};
var createDocumentFragment = () => document2.createDocumentFragment();
var childAt = (node, at2) => node.childNodes[at2 | 0];
var meta = Symbol("lustre");
var initialiseMetadata = (parent, node, key = "") => {
  switch (node.nodeType) {
    case ELEMENT_NODE:
    case DOCUMENT_FRAGMENT_NODE:
      node[meta] = {
        key,
        keyedChildren: /* @__PURE__ */ new Map(),
        handlers: /* @__PURE__ */ new Map(),
        throttles: /* @__PURE__ */ new Map(),
        debouncers: /* @__PURE__ */ new Map()
      };
      break;
    case TEXT_NODE:
      node[meta] = { key };
      break;
  }
  if (parent && key) {
    parent[meta].keyedChildren.set(key, new WeakRef(node));
  }
};
var getKeyedChild = (node, key) => node[meta].keyedChildren.get(key).deref();
var handleEvent = (event4) => {
  const target = event4.currentTarget;
  const handler = target[meta].handlers.get(event4.type);
  if (event4.type === "submit") {
    event4.detail ??= {};
    event4.detail.formData = [...new FormData(event4.target).entries()];
  }
  handler(event4);
};
var createServerEvent = (event4, include2 = []) => {
  const data = {};
  if (event4.type === "input" || event4.type === "change") {
    include2.push("target.value");
  }
  if (event4.type === "submit") {
    include2.push("detail.formData");
  }
  for (const property3 of include2) {
    const path2 = property3.split(".");
    for (let i = 0, input3 = event4, output = data; i < path2.length; i++) {
      if (i === path2.length - 1) {
        output[path2[i]] = input3[path2[i]];
        break;
      }
      output = output[path2[i]] ??= {};
      input3 = input3[path2[i]];
    }
  }
  return data;
};
var syncedBooleanAttribute = (name3) => {
  return {
    added(node) {
      node[name3] = true;
    },
    removed(node) {
      node[name3] = false;
    }
  };
};
var syncedAttribute = (name3) => {
  return {
    added(node, value2) {
      node[name3] = value2;
    }
  };
};
var SYNCED_ATTRIBUTES = {
  checked: syncedBooleanAttribute("checked"),
  selected: syncedBooleanAttribute("selected"),
  value: syncedAttribute("value"),
  autofocus: {
    added(node) {
      queueMicrotask(() => node.focus?.());
    }
  },
  autoplay: {
    added(node) {
      try {
        node.play?.();
      } catch (e) {
        console.error(e);
      }
    }
  }
};

// build/dev/javascript/lustre/lustre/vdom/virtualise.ffi.mjs
var virtualise = (root3) => {
  const vdom = virtualiseNode(null, root3);
  if (vdom === null || vdom.children instanceof Empty) {
    const empty4 = emptyTextNode(root3);
    root3.appendChild(empty4);
    return none2();
  } else if (vdom.children instanceof NonEmpty && vdom.children.tail instanceof Empty) {
    return vdom.children.head;
  } else {
    const head = emptyTextNode(root3);
    root3.insertBefore(head, root3.firstChild);
    return fragment2(vdom.children);
  }
};
var emptyTextNode = (parent) => {
  const node = document2.createTextNode("");
  initialiseMetadata(parent, node);
  return node;
};
var virtualiseNode = (parent, node) => {
  switch (node.nodeType) {
    case ELEMENT_NODE: {
      const key = node.getAttribute("data-lustre-key");
      initialiseMetadata(parent, node, key);
      if (key) {
        node.removeAttribute("data-lustre-key");
      }
      const tag = node.localName;
      const namespace2 = node.namespaceURI;
      const isHtmlElement = !namespace2 || namespace2 === NAMESPACE_HTML;
      if (isHtmlElement && INPUT_ELEMENTS.includes(tag)) {
        virtualiseInputEvents(tag, node);
      }
      const attributes = virtualiseAttributes(node);
      const children = virtualiseChildNodes(node);
      const vnode = isHtmlElement ? element2(tag, attributes, children) : namespaced(namespace2, tag, attributes, children);
      return key ? to_keyed(key, vnode) : vnode;
    }
    case TEXT_NODE:
      initialiseMetadata(parent, node);
      return text2(node.data);
    case DOCUMENT_FRAGMENT_NODE:
      initialiseMetadata(parent, node);
      return node.childNodes.length > 0 ? fragment2(virtualiseChildNodes(node)) : null;
    default:
      return null;
  }
};
var INPUT_ELEMENTS = ["input", "select", "textarea"];
var virtualiseInputEvents = (tag, node) => {
  const value2 = node.value;
  const checked = node.checked;
  if (tag === "input" && node.type === "checkbox" && !checked) return;
  if (tag === "input" && node.type === "radio" && !checked) return;
  if (node.type !== "checkbox" && node.type !== "radio" && !value2) return;
  queueMicrotask(() => {
    node.value = value2;
    node.checked = checked;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
    if (document2.activeElement !== node) {
      node.dispatchEvent(new Event("blur", { bubbles: true }));
    }
  });
};
var virtualiseChildNodes = (node) => {
  let children = empty_list;
  let child = node.lastChild;
  while (child) {
    const vnode = virtualiseNode(node, child);
    const next = child.previousSibling;
    if (vnode) {
      children = new NonEmpty(vnode, children);
    } else {
      node.removeChild(child);
    }
    child = next;
  }
  return children;
};
var virtualiseAttributes = (node) => {
  let index4 = node.attributes.length;
  let attributes = empty_list;
  while (index4-- > 0) {
    attributes = new NonEmpty(
      virtualiseAttribute(node.attributes[index4]),
      attributes
    );
  }
  return attributes;
};
var virtualiseAttribute = (attr) => {
  const name3 = attr.localName;
  const value2 = attr.value;
  return attribute2(name3, value2);
};

// build/dev/javascript/lustre/lustre/runtime/client/runtime.ffi.mjs
var is_browser = () => !!document2;
var is_reference_equal = (a2, b) => a2 === b;
var Runtime = class {
  constructor(root3, [model, effects], view5, update5) {
    this.root = root3;
    this.#model = model;
    this.#view = view5;
    this.#update = update5;
    this.#reconciler = new Reconciler(this.root, (event4, path2, name3) => {
      const [events, msg] = handle(this.#events, path2, name3, event4);
      this.#events = events;
      if (msg.isOk()) {
        this.dispatch(msg[0], false);
      }
    });
    this.#vdom = virtualise(this.root);
    this.#events = new$5();
    this.#shouldFlush = true;
    this.#tick(effects);
  }
  // PUBLIC API ----------------------------------------------------------------
  root = null;
  set offset(offset) {
    this.#reconciler.offset = offset;
  }
  dispatch(msg, immediate2 = false) {
    this.#shouldFlush ||= immediate2;
    if (this.#shouldQueue) {
      this.#queue.push(msg);
    } else {
      const [model, effects] = this.#update(this.#model, msg);
      this.#model = model;
      this.#tick(effects);
    }
  }
  emit(event4, data) {
    const target = this.root.host ?? this.root;
    target.dispatchEvent(
      new CustomEvent(event4, {
        detail: data,
        bubbles: true,
        composed: true
      })
    );
  }
  // PRIVATE API ---------------------------------------------------------------
  #model;
  #view;
  #update;
  #vdom;
  #events;
  #reconciler;
  #shouldQueue = false;
  #queue = [];
  #beforePaint = empty_list;
  #afterPaint = empty_list;
  #renderTimer = null;
  #shouldFlush = false;
  #actions = {
    dispatch: (msg, immediate2) => this.dispatch(msg, immediate2),
    emit: (event4, data) => this.emit(event4, data),
    select: () => {
    },
    root: () => this.root
  };
  // A `#tick` is where we process effects and trigger any synchronous updates.
  // Once a tick has been processed a render will be scheduled if none is already.
  // p0
  #tick(effects) {
    this.#shouldQueue = true;
    while (true) {
      for (let list4 = effects.synchronous; list4.tail; list4 = list4.tail) {
        list4.head(this.#actions);
      }
      this.#beforePaint = listAppend(this.#beforePaint, effects.before_paint);
      this.#afterPaint = listAppend(this.#afterPaint, effects.after_paint);
      if (!this.#queue.length) break;
      [this.#model, effects] = this.#update(this.#model, this.#queue.shift());
    }
    this.#shouldQueue = false;
    if (this.#shouldFlush) {
      cancelAnimationFrame(this.#renderTimer);
      this.#render();
    } else if (!this.#renderTimer) {
      this.#renderTimer = requestAnimationFrame(() => {
        this.#render();
      });
    }
  }
  #render() {
    this.#shouldFlush = false;
    this.#renderTimer = null;
    const next = this.#view(this.#model);
    const { patch, events } = diff(this.#events, this.#vdom, next);
    this.#events = events;
    this.#vdom = next;
    this.#reconciler.push(patch);
    if (this.#beforePaint instanceof NonEmpty) {
      const effects = makeEffect(this.#beforePaint);
      this.#beforePaint = empty_list;
      queueMicrotask(() => {
        this.#shouldFlush = true;
        this.#tick(effects);
      });
    }
    if (this.#afterPaint instanceof NonEmpty) {
      const effects = makeEffect(this.#afterPaint);
      this.#afterPaint = empty_list;
      requestAnimationFrame(() => {
        this.#shouldFlush = true;
        this.#tick(effects);
      });
    }
  }
};
function makeEffect(synchronous) {
  return {
    synchronous,
    after_paint: empty_list,
    before_paint: empty_list
  };
}
function listAppend(a2, b) {
  if (a2 instanceof Empty) {
    return b;
  } else if (b instanceof Empty) {
    return a2;
  } else {
    return append(a2, b);
  }
}
var copiedStyleSheets = /* @__PURE__ */ new WeakMap();
async function adoptStylesheets(shadowRoot) {
  const pendingParentStylesheets = [];
  for (const node of document2.querySelectorAll("link[rel=stylesheet], style")) {
    if (node.sheet) continue;
    pendingParentStylesheets.push(
      new Promise((resolve, reject) => {
        node.addEventListener("load", resolve);
        node.addEventListener("error", reject);
      })
    );
  }
  await Promise.allSettled(pendingParentStylesheets);
  if (!shadowRoot.host.isConnected) {
    return [];
  }
  shadowRoot.adoptedStyleSheets = shadowRoot.host.getRootNode().adoptedStyleSheets;
  const pending = [];
  for (const sheet of document2.styleSheets) {
    try {
      shadowRoot.adoptedStyleSheets.push(sheet);
    } catch {
      try {
        let copiedSheet = copiedStyleSheets.get(sheet);
        if (!copiedSheet) {
          copiedSheet = new CSSStyleSheet();
          for (const rule of sheet.cssRules) {
            copiedSheet.insertRule(rule.cssText, copiedSheet.cssRules.length);
          }
          copiedStyleSheets.set(sheet, copiedSheet);
        }
        shadowRoot.adoptedStyleSheets.push(copiedSheet);
      } catch {
        const node = sheet.ownerNode.cloneNode();
        shadowRoot.prepend(node);
        pending.push(node);
      }
    }
  }
  return pending;
}

// build/dev/javascript/lustre/lustre/vdom/events.mjs
var Events = class extends CustomType {
  constructor(handlers, dispatched_paths, next_dispatched_paths) {
    super();
    this.handlers = handlers;
    this.dispatched_paths = dispatched_paths;
    this.next_dispatched_paths = next_dispatched_paths;
  }
};
function new$5() {
  return new Events(
    empty2(),
    empty_list,
    empty_list
  );
}
function tick(events) {
  return new Events(
    events.handlers,
    events.next_dispatched_paths,
    empty_list
  );
}
function do_remove_event(handlers, path2, name3) {
  return remove(handlers, event3(path2, name3));
}
function remove_event(events, path2, name3) {
  let handlers = do_remove_event(events.handlers, path2, name3);
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}
function remove_attributes(handlers, path2, attributes) {
  return fold2(
    attributes,
    handlers,
    (events, attribute3) => {
      if (attribute3 instanceof Event2) {
        let name3 = attribute3.name;
        return do_remove_event(events, path2, name3);
      } else {
        return events;
      }
    }
  );
}
function handle(events, path2, name3, event4) {
  let next_dispatched_paths = prepend(path2, events.next_dispatched_paths);
  let _block;
  let _record = events;
  _block = new Events(
    _record.handlers,
    _record.dispatched_paths,
    next_dispatched_paths
  );
  let events$1 = _block;
  let $ = get(
    events$1.handlers,
    path2 + separator_event + name3
  );
  if ($.isOk()) {
    let handler = $[0];
    return [events$1, run(event4, handler)];
  } else {
    return [events$1, new Error(toList([]))];
  }
}
function has_dispatched_events(events, path2) {
  return matches(path2, events.dispatched_paths);
}
function do_add_event(handlers, mapper, path2, name3, handler) {
  return insert3(
    handlers,
    event3(path2, name3),
    map3(handler, identity2(mapper))
  );
}
function add_event(events, mapper, path2, name3, handler) {
  let handlers = do_add_event(events.handlers, mapper, path2, name3, handler);
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}
function add_attributes(handlers, mapper, path2, attributes) {
  return fold2(
    attributes,
    handlers,
    (events, attribute3) => {
      if (attribute3 instanceof Event2) {
        let name3 = attribute3.name;
        let handler = attribute3.handler;
        return do_add_event(events, mapper, path2, name3, handler);
      } else {
        return events;
      }
    }
  );
}
function compose_mapper(mapper, child_mapper) {
  let $ = is_reference_equal(mapper, identity2);
  let $1 = is_reference_equal(child_mapper, identity2);
  if ($1) {
    return mapper;
  } else if ($ && !$1) {
    return child_mapper;
  } else {
    return (msg) => {
      return mapper(child_mapper(msg));
    };
  }
}
function do_remove_children(loop$handlers, loop$path, loop$child_index, loop$children) {
  while (true) {
    let handlers = loop$handlers;
    let path2 = loop$path;
    let child_index = loop$child_index;
    let children = loop$children;
    if (children.hasLength(0)) {
      return handlers;
    } else {
      let child = children.head;
      let rest = children.tail;
      let _pipe = handlers;
      let _pipe$1 = do_remove_child(_pipe, path2, child_index, child);
      loop$handlers = _pipe$1;
      loop$path = path2;
      loop$child_index = child_index + advance(child);
      loop$children = rest;
    }
  }
}
function do_remove_child(handlers, parent, child_index, child) {
  if (child instanceof Element) {
    let attributes = child.attributes;
    let children = child.children;
    let path2 = add2(parent, child_index, child.key);
    let _pipe = handlers;
    let _pipe$1 = remove_attributes(_pipe, path2, attributes);
    return do_remove_children(_pipe$1, path2, 0, children);
  } else if (child instanceof Fragment) {
    let children = child.children;
    return do_remove_children(handlers, parent, child_index + 1, children);
  } else if (child instanceof UnsafeInnerHtml) {
    let attributes = child.attributes;
    let path2 = add2(parent, child_index, child.key);
    return remove_attributes(handlers, path2, attributes);
  } else {
    return handlers;
  }
}
function remove_child(events, parent, child_index, child) {
  let handlers = do_remove_child(events.handlers, parent, child_index, child);
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}
function do_add_children(loop$handlers, loop$mapper, loop$path, loop$child_index, loop$children) {
  while (true) {
    let handlers = loop$handlers;
    let mapper = loop$mapper;
    let path2 = loop$path;
    let child_index = loop$child_index;
    let children = loop$children;
    if (children.hasLength(0)) {
      return handlers;
    } else {
      let child = children.head;
      let rest = children.tail;
      let _pipe = handlers;
      let _pipe$1 = do_add_child(_pipe, mapper, path2, child_index, child);
      loop$handlers = _pipe$1;
      loop$mapper = mapper;
      loop$path = path2;
      loop$child_index = child_index + advance(child);
      loop$children = rest;
    }
  }
}
function do_add_child(handlers, mapper, parent, child_index, child) {
  if (child instanceof Element) {
    let attributes = child.attributes;
    let children = child.children;
    let path2 = add2(parent, child_index, child.key);
    let composed_mapper = compose_mapper(mapper, child.mapper);
    let _pipe = handlers;
    let _pipe$1 = add_attributes(_pipe, composed_mapper, path2, attributes);
    return do_add_children(_pipe$1, composed_mapper, path2, 0, children);
  } else if (child instanceof Fragment) {
    let children = child.children;
    let composed_mapper = compose_mapper(mapper, child.mapper);
    let child_index$1 = child_index + 1;
    return do_add_children(
      handlers,
      composed_mapper,
      parent,
      child_index$1,
      children
    );
  } else if (child instanceof UnsafeInnerHtml) {
    let attributes = child.attributes;
    let path2 = add2(parent, child_index, child.key);
    let composed_mapper = compose_mapper(mapper, child.mapper);
    return add_attributes(handlers, composed_mapper, path2, attributes);
  } else {
    return handlers;
  }
}
function add_child(events, mapper, parent, index4, child) {
  let handlers = do_add_child(events.handlers, mapper, parent, index4, child);
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}
function add_children(events, mapper, path2, child_index, children) {
  let handlers = do_add_children(
    events.handlers,
    mapper,
    path2,
    child_index,
    children
  );
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}

// build/dev/javascript/lustre/lustre/element.mjs
function element2(tag, attributes, children) {
  return element(
    "",
    identity2,
    "",
    tag,
    attributes,
    children,
    empty2(),
    false,
    false
  );
}
function namespaced(namespace2, tag, attributes, children) {
  return element(
    "",
    identity2,
    namespace2,
    tag,
    attributes,
    children,
    empty2(),
    false,
    false
  );
}
function text2(content) {
  return text("", identity2, content);
}
function none2() {
  return text("", identity2, "");
}
function count_fragment_children(loop$children, loop$count) {
  while (true) {
    let children = loop$children;
    let count = loop$count;
    if (children.hasLength(0)) {
      return count;
    } else if (children.atLeastLength(1) && children.head instanceof Fragment) {
      let children_count = children.head.children_count;
      let rest = children.tail;
      loop$children = rest;
      loop$count = count + children_count;
    } else {
      let rest = children.tail;
      loop$children = rest;
      loop$count = count + 1;
    }
  }
}
function fragment2(children) {
  return fragment(
    "",
    identity2,
    children,
    empty2(),
    count_fragment_children(children, 0)
  );
}

// build/dev/javascript/lustre/lustre/element/html.mjs
function text3(content) {
  return text2(content);
}
function article(attrs, children) {
  return element2("article", attrs, children);
}
function h1(attrs, children) {
  return element2("h1", attrs, children);
}
function h2(attrs, children) {
  return element2("h2", attrs, children);
}
function h3(attrs, children) {
  return element2("h3", attrs, children);
}
function main(attrs, children) {
  return element2("main", attrs, children);
}
function nav(attrs, children) {
  return element2("nav", attrs, children);
}
function div(attrs, children) {
  return element2("div", attrs, children);
}
function li(attrs, children) {
  return element2("li", attrs, children);
}
function p(attrs, children) {
  return element2("p", attrs, children);
}
function ul(attrs, children) {
  return element2("ul", attrs, children);
}
function a(attrs, children) {
  return element2("a", attrs, children);
}
function span(attrs, children) {
  return element2("span", attrs, children);
}
function svg(attrs, children) {
  return namespaced("http://www.w3.org/2000/svg", "svg", attrs, children);
}
function button(attrs, children) {
  return element2("button", attrs, children);
}
function input(attrs) {
  return element2("input", attrs, empty_list);
}
function label(attrs, children) {
  return element2("label", attrs, children);
}
function slot(attrs, fallback) {
  return element2("slot", attrs, fallback);
}

// build/dev/javascript/lustre/lustre/runtime/server/runtime.mjs
var EffectDispatchedMessage = class extends CustomType {
  constructor(message2) {
    super();
    this.message = message2;
  }
};
var EffectEmitEvent = class extends CustomType {
  constructor(name3, data) {
    super();
    this.name = name3;
    this.data = data;
  }
};
var SystemRequestedShutdown = class extends CustomType {
};

// build/dev/javascript/lustre/lustre/runtime/client/component.ffi.mjs
var make_component = ({ init: init5, update: update5, view: view5, config }, name3) => {
  if (!is_browser()) return new Error(new NotABrowser());
  if (!name3.includes("-")) return new Error(new BadComponentName(name3));
  if (customElements.get(name3)) {
    return new Error(new ComponentAlreadyRegistered(name3));
  }
  const [model, effects] = init5(void 0);
  const observedAttributes = config.attributes.entries().map(([name4]) => name4);
  const component2 = class Component extends HTMLElement {
    static get observedAttributes() {
      return observedAttributes;
    }
    static formAssociated = config.is_form_associated;
    #runtime;
    #adoptedStyleNodes = [];
    #shadowRoot;
    constructor() {
      super();
      this.internals = this.attachInternals();
      if (!this.internals.shadowRoot) {
        this.#shadowRoot = this.attachShadow({
          mode: config.open_shadow_root ? "open" : "closed"
        });
      } else {
        this.#shadowRoot = this.internals.shadowRoot;
      }
      if (config.adopt_styles) {
        this.#adoptStyleSheets();
      }
      this.#runtime = new Runtime(
        this.#shadowRoot,
        [model, effects],
        view5,
        update5
      );
    }
    adoptedCallback() {
      if (config.adopt_styles) {
        this.#adoptStyleSheets();
      }
    }
    attributeChangedCallback(name4, _, value2) {
      const decoded = config.attributes.get(name4)(value2);
      if (decoded.constructor === Ok) {
        this.dispatch(decoded[0]);
      }
    }
    formResetCallback() {
      if (config.on_form_reset instanceof Some) {
        this.dispatch(config.on_form_reset[0]);
      }
    }
    formStateRestoreCallback(state, reason) {
      switch (reason) {
        case "restore":
          if (config.on_form_restore instanceof Some) {
            this.dispatch(config.on_form_restore[0](state));
          }
          break;
        case "autocomplete":
          if (config.on_form_populate instanceof Some) {
            this.dispatch(config.on_form_autofill[0](state));
          }
          break;
      }
    }
    send(message2) {
      switch (message2.constructor) {
        case EffectDispatchedMessage: {
          this.dispatch(message2.message, false);
          break;
        }
        case EffectEmitEvent: {
          this.emit(message2.name, message2.data);
          break;
        }
        case SystemRequestedShutdown:
          break;
      }
    }
    dispatch(msg, immediate2 = false) {
      this.#runtime.dispatch(msg, immediate2);
    }
    emit(event4, data) {
      this.#runtime.emit(event4, data);
    }
    async #adoptStyleSheets() {
      while (this.#adoptedStyleNodes.length) {
        this.#adoptedStyleNodes.pop().remove();
        this.shadowRoot.firstChild.remove();
      }
      this.#adoptedStyleNodes = await adoptStylesheets(this.#shadowRoot);
      this.#runtime.offset = this.#adoptedStyleNodes.length;
    }
  };
  config.properties.forEach((decoder, name4) => {
    Object.defineProperty(component2.prototype, name4, {
      get() {
        return this[`_${name4}`];
      },
      set(value2) {
        this[`_${name4}`] = value2;
        const decoded = run(value2, decoder);
        if (decoded.constructor === Ok) {
          this.dispatch(decoded[0]);
        }
      }
    });
  });
  customElements.define(name3, component2);
  return new Ok(void 0);
};

// build/dev/javascript/lustre/lustre/component.mjs
var Config2 = class extends CustomType {
  constructor(open_shadow_root2, adopt_styles, attributes, properties, is_form_associated, on_form_autofill, on_form_reset, on_form_restore) {
    super();
    this.open_shadow_root = open_shadow_root2;
    this.adopt_styles = adopt_styles;
    this.attributes = attributes;
    this.properties = properties;
    this.is_form_associated = is_form_associated;
    this.on_form_autofill = on_form_autofill;
    this.on_form_reset = on_form_reset;
    this.on_form_restore = on_form_restore;
  }
};
var Option = class extends CustomType {
  constructor(apply) {
    super();
    this.apply = apply;
  }
};
function new$6(options2) {
  let init5 = new Config2(
    false,
    true,
    empty_dict(),
    empty_dict(),
    false,
    option_none,
    option_none,
    option_none
  );
  return fold2(
    options2,
    init5,
    (config, option) => {
      return option.apply(config);
    }
  );
}
function open_shadow_root(open) {
  return new Option(
    (config) => {
      let _record = config;
      return new Config2(
        open,
        _record.adopt_styles,
        _record.attributes,
        _record.properties,
        _record.is_form_associated,
        _record.on_form_autofill,
        _record.on_form_reset,
        _record.on_form_restore
      );
    }
  );
}
function default_slot(attributes, fallback) {
  return slot(attributes, fallback);
}
function named_slot(name3, attributes, fallback) {
  return slot(prepend(attribute2("name", name3), attributes), fallback);
}

// build/dev/javascript/lustre/lustre/runtime/client/spa.ffi.mjs
var Spa = class _Spa {
  static start({ init: init5, update: update5, view: view5 }, selector, flags) {
    if (!is_browser()) return new Error(new NotABrowser());
    const root3 = selector instanceof HTMLElement ? selector : document2.querySelector(selector);
    if (!root3) return new Error(new ElementNotFound(selector));
    return new Ok(new _Spa(root3, init5(flags), update5, view5));
  }
  #runtime;
  constructor(root3, [init5, effects], update5, view5) {
    this.#runtime = new Runtime(root3, [init5, effects], view5, update5);
  }
  send(message2) {
    switch (message2.constructor) {
      case EffectDispatchedMessage: {
        this.dispatch(message2.message, false);
        break;
      }
      case EffectEmitEvent: {
        this.emit(message2.name, message2.data);
        break;
      }
      case SystemRequestedShutdown:
        break;
    }
  }
  dispatch(msg, immediate2) {
    this.#runtime.dispatch(msg, immediate2);
  }
  emit(event4, data) {
    this.#runtime.emit(event4, data);
  }
};
var start = Spa.start;

// build/dev/javascript/lustre/lustre.mjs
var App = class extends CustomType {
  constructor(init5, update5, view5, config) {
    super();
    this.init = init5;
    this.update = update5;
    this.view = view5;
    this.config = config;
  }
};
var BadComponentName = class extends CustomType {
  constructor(name3) {
    super();
    this.name = name3;
  }
};
var ComponentAlreadyRegistered = class extends CustomType {
  constructor(name3) {
    super();
    this.name = name3;
  }
};
var ElementNotFound = class extends CustomType {
  constructor(selector) {
    super();
    this.selector = selector;
  }
};
var NotABrowser = class extends CustomType {
};
function component(init5, update5, view5, options2) {
  return new App(init5, update5, view5, new$6(options2));
}
function application(init5, update5, view5) {
  return new App(init5, update5, view5, new$6(empty_list));
}
function start3(app, selector, start_args) {
  return guard(
    !is_browser(),
    new Error(new NotABrowser()),
    () => {
      return start(app, selector, start_args);
    }
  );
}

// build/dev/javascript/gleam_stdlib/gleam/pair.mjs
function new$7(first2, second2) {
  return [first2, second2];
}

// build/dev/javascript/modem/modem.ffi.mjs
var defaults = {
  handle_external_links: false,
  handle_internal_links: true
};
var initial_location = globalThis?.window?.location?.href;
var do_initial_uri = () => {
  if (!initial_location) {
    return new Error(void 0);
  } else {
    return new Ok(uri_from_url(new URL(initial_location)));
  }
};
var do_init = (dispatch, options2 = defaults) => {
  document.addEventListener("click", (event4) => {
    const a2 = find_anchor(event4.target);
    if (!a2) return;
    try {
      const url = new URL(a2.href);
      const uri = uri_from_url(url);
      const is_external = url.host !== window.location.host;
      if (!options2.handle_external_links && is_external) return;
      if (!options2.handle_internal_links && !is_external) return;
      event4.preventDefault();
      if (!is_external) {
        window.history.pushState({}, "", a2.href);
        window.requestAnimationFrame(() => {
          if (url.hash) {
            document.getElementById(url.hash.slice(1))?.scrollIntoView();
          }
        });
      }
      return dispatch(uri);
    } catch {
      return;
    }
  });
  window.addEventListener("popstate", (e) => {
    e.preventDefault();
    const url = new URL(window.location.href);
    const uri = uri_from_url(url);
    window.requestAnimationFrame(() => {
      if (url.hash) {
        document.getElementById(url.hash.slice(1))?.scrollIntoView();
      }
    });
    dispatch(uri);
  });
  window.addEventListener("modem-push", ({ detail }) => {
    dispatch(detail);
  });
  window.addEventListener("modem-replace", ({ detail }) => {
    dispatch(detail);
  });
};
var find_anchor = (el) => {
  if (!el || el.tagName === "BODY") {
    return null;
  } else if (el.tagName === "A") {
    return el;
  } else {
    return find_anchor(el.parentElement);
  }
};
var uri_from_url = (url) => {
  return new Uri(
    /* scheme   */
    url.protocol ? new Some(url.protocol.slice(0, -1)) : new None(),
    /* userinfo */
    new None(),
    /* host     */
    url.hostname ? new Some(url.hostname) : new None(),
    /* port     */
    url.port ? new Some(Number(url.port)) : new None(),
    /* path     */
    url.pathname,
    /* query    */
    url.search ? new Some(url.search.slice(1)) : new None(),
    /* fragment */
    url.hash ? new Some(url.hash.slice(1)) : new None()
  );
};

// build/dev/javascript/modem/modem.mjs
function init(handler) {
  return from(
    (dispatch) => {
      return guard(
        !is_browser(),
        void 0,
        () => {
          return do_init(
            (uri) => {
              let _pipe = uri;
              let _pipe$1 = handler(_pipe);
              return dispatch(_pipe$1);
            }
          );
        }
      );
    }
  );
}

// build/dev/javascript/lustre/lustre/server_component.mjs
function element3(attributes, children) {
  return element2("lustre-server-component", attributes, children);
}
function route(path2) {
  return attribute2("route", path2);
}
function include(event4, properties) {
  if (event4 instanceof Event2) {
    let _record = event4;
    return new Event2(
      _record.kind,
      _record.name,
      _record.handler,
      properties,
      _record.prevent_default,
      _record.stop_propagation,
      _record.immediate,
      _record.debounce,
      _record.throttle
    );
  } else {
    return event4;
  }
}

// build/dev/javascript/client/client/counter_ano.mjs
var path_segments2 = /* @__PURE__ */ toList(["ws", "counter"]);
function element4(attributes, children) {
  return element3(
    prepend(
      (() => {
        let _pipe = path_segments2;
        let _pipe$1 = prepend2(_pipe, "");
        let _pipe$2 = join(_pipe$1, "/");
        return route(_pipe$2);
      })(),
      attributes
    ),
    children
  );
}

// build/dev/javascript/gleam_time/gleam/time/calendar.mjs
var Date2 = class extends CustomType {
  constructor(year, month, day) {
    super();
    this.year = year;
    this.month = month;
    this.day = day;
  }
};
var January = class extends CustomType {
};
var February = class extends CustomType {
};
var March = class extends CustomType {
};
var April = class extends CustomType {
};
var May = class extends CustomType {
};
var June = class extends CustomType {
};
var July = class extends CustomType {
};
var August = class extends CustomType {
};
var September = class extends CustomType {
};
var October = class extends CustomType {
};
var November = class extends CustomType {
};
var December = class extends CustomType {
};
function month_to_int(month) {
  if (month instanceof January) {
    return 1;
  } else if (month instanceof February) {
    return 2;
  } else if (month instanceof March) {
    return 3;
  } else if (month instanceof April) {
    return 4;
  } else if (month instanceof May) {
    return 5;
  } else if (month instanceof June) {
    return 6;
  } else if (month instanceof July) {
    return 7;
  } else if (month instanceof August) {
    return 8;
  } else if (month instanceof September) {
    return 9;
  } else if (month instanceof October) {
    return 10;
  } else if (month instanceof November) {
    return 11;
  } else {
    return 12;
  }
}
function month_from_int(month) {
  if (month === 1) {
    return new Ok(new January());
  } else if (month === 2) {
    return new Ok(new February());
  } else if (month === 3) {
    return new Ok(new March());
  } else if (month === 4) {
    return new Ok(new April());
  } else if (month === 5) {
    return new Ok(new May());
  } else if (month === 6) {
    return new Ok(new June());
  } else if (month === 7) {
    return new Ok(new July());
  } else if (month === 8) {
    return new Ok(new August());
  } else if (month === 9) {
    return new Ok(new September());
  } else if (month === 10) {
    return new Ok(new October());
  } else if (month === 11) {
    return new Ok(new November());
  } else if (month === 12) {
    return new Ok(new December());
  } else {
    return new Error(void 0);
  }
}

// build/dev/javascript/lustre/lustre/element/keyed.mjs
function extract_keyed_children(children) {
  let init5 = [empty2(), empty_list, 0];
  let $ = fold2(
    children,
    init5,
    (_use0, _use1) => {
      let keyed_children2 = _use0[0];
      let children$12 = _use0[1];
      let children_count2 = _use0[2];
      let key = _use1[0];
      let element$1 = _use1[1];
      let keyed_element = to_keyed(key, element$1);
      let _block;
      if (key === "") {
        _block = keyed_children2;
      } else {
        _block = insert3(keyed_children2, key, keyed_element);
      }
      let keyed_children$1 = _block;
      return [
        keyed_children$1,
        prepend(keyed_element, children$12),
        children_count2 + 1
      ];
    }
  );
  let keyed_children = $[0];
  let children$1 = $[1];
  let children_count = $[2];
  return [keyed_children, reverse(children$1), children_count];
}
function element5(tag, attributes, children) {
  let $ = extract_keyed_children(children);
  let keyed_children = $[0];
  let children$1 = $[1];
  return element(
    "",
    identity2,
    "",
    tag,
    attributes,
    children$1,
    keyed_children,
    false,
    false
  );
}
function ul2(attributes, children) {
  return element5("ul", attributes, children);
}
function div2(attributes, children) {
  return element5("div", attributes, children);
}

// build/dev/javascript/lustre/lustre/event.mjs
function emit(event4, data) {
  return event2(event4, data);
}
function is_immediate_event(name3) {
  if (name3 === "input") {
    return true;
  } else if (name3 === "change") {
    return true;
  } else if (name3 === "focus") {
    return true;
  } else if (name3 === "focusin") {
    return true;
  } else if (name3 === "focusout") {
    return true;
  } else if (name3 === "blur") {
    return true;
  } else if (name3 === "select") {
    return true;
  } else {
    return false;
  }
}
function on(name3, handler) {
  return event(
    name3,
    handler,
    empty_list,
    false,
    false,
    is_immediate_event(name3),
    0,
    0
  );
}
function on_click(msg) {
  return on("click", success(msg));
}
function on_mouse_down(msg) {
  return on("mousedown", success(msg));
}
function on_mouse_over(msg) {
  return on("mouseover", success(msg));
}
function on_keydown(msg) {
  return on(
    "keydown",
    field(
      "key",
      string2,
      (key) => {
        let _pipe = key;
        let _pipe$1 = msg(_pipe);
        return success(_pipe$1);
      }
    )
  );
}
function on_input(msg) {
  return on(
    "input",
    subfield(
      toList(["target", "value"]),
      string2,
      (value2) => {
        return success(msg(value2));
      }
    )
  );
}

// build/dev/javascript/client/client/customer_combobox.mjs
var change_event = "change";
var detail_key = "detail";
var value_key = "value";
function on_change(handler) {
  let key = toList([detail_key, value_key]);
  let _pipe = on(
    change_event,
    (() => {
      let _pipe2 = at(key, int2);
      return map3(_pipe2, handler);
    })()
  );
  return include(
    _pipe,
    toList([
      (() => {
        let _pipe$1 = key;
        return join(_pipe$1, ".");
      })()
    ])
  );
}
var path_segments3 = /* @__PURE__ */ toList(["ws", "combobox"]);
function element6(attributes, children) {
  return element3(
    prepend(
      (() => {
        let _pipe = path_segments3;
        let _pipe$1 = prepend2(_pipe, "");
        let _pipe$2 = join(_pipe$1, "/");
        return route(_pipe$2);
      })(),
      attributes
    ),
    children
  );
}

// build/dev/javascript/client/client/formy.mjs
var NonEmptyString = class extends CustomType {
  constructor(inner) {
    super();
    this.inner = inner;
  }
};
var PositiveInt = class extends CustomType {
  constructor(inner) {
    super();
    this.inner = inner;
  }
};
var NonNegativeFloat = class extends CustomType {
  constructor(inner) {
    super();
    this.inner = inner;
  }
};
var Model = class extends CustomType {
  constructor(date, add3, remarks, customer_remarks, customer_id, sales_rep_id, buyer_name, customer_name, ship_via, freight_charge, warehouse_id, line_items, project_name) {
    super();
    this.date = date;
    this.add = add3;
    this.remarks = remarks;
    this.customer_remarks = customer_remarks;
    this.customer_id = customer_id;
    this.sales_rep_id = sales_rep_id;
    this.buyer_name = buyer_name;
    this.customer_name = customer_name;
    this.ship_via = ship_via;
    this.freight_charge = freight_charge;
    this.warehouse_id = warehouse_id;
    this.line_items = line_items;
    this.project_name = project_name;
  }
};
var LineItemForm = class extends CustomType {
  constructor(item_id, quantity, unit_price, commission_rate, discount_rate) {
    super();
    this.item_id = item_id;
    this.quantity = quantity;
    this.unit_price = unit_price;
    this.commission_rate = commission_rate;
    this.discount_rate = discount_rate;
  }
};
var Form = class extends CustomType {
  constructor(date, add3, remarks, customer_remarks, customer_id, sales_rep_id, buyer_name, customer_name, ship_via, freight_charge, warehouse_id, line_items, project_name) {
    super();
    this.date = date;
    this.add = add3;
    this.remarks = remarks;
    this.customer_remarks = customer_remarks;
    this.customer_id = customer_id;
    this.sales_rep_id = sales_rep_id;
    this.buyer_name = buyer_name;
    this.customer_name = customer_name;
    this.ship_via = ship_via;
    this.freight_charge = freight_charge;
    this.warehouse_id = warehouse_id;
    this.line_items = line_items;
    this.project_name = project_name;
  }
};
var LineItem = class extends CustomType {
  constructor(item_id, quantity, unit_price, commission_rate, discount_rate) {
    super();
    this.item_id = item_id;
    this.quantity = quantity;
    this.unit_price = unit_price;
    this.commission_rate = commission_rate;
    this.discount_rate = discount_rate;
  }
};
var Field = class extends CustomType {
  constructor(value2, parsed_value) {
    super();
    this.value = value2;
    this.parsed_value = parsed_value;
  }
};
var UserClickedSave = class extends CustomType {
};
var UserAddedLineItem = class extends CustomType {
};
var UserRemovedLineItem = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UserUpdatedDate = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UserUpdatedCustomerId = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UserUpdatedShipVia = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UserUpdatedWarehouseId = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UserUpdatedFreightCharge = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UserUpdatedProjectName = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UserUpdatedAdd = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UserUpdatedRemarks = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UserUpdatedCustomerRemarks = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UserUpdatedSalesRepId = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UserUpdatedBuyerName = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UserUpdatedCustomerName = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UserUpdatedItemId = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var UserUpdatedQuantity = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var UserUpdatedCommissionRate = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var UserUpdatedUnitPrice = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var UserUpdatedDiscountRate = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
function non_negative_float_new(float4) {
  let $ = float4 < 0;
  if ($) {
    let _pipe = "Must be greater than or equal to 0";
    return new Error(_pipe);
  } else {
    let _pipe = float4;
    let _pipe$1 = new NonNegativeFloat(_pipe);
    return new Ok(_pipe$1);
  }
}
function encode_date(date) {
  let year = date.year;
  let month = date.month;
  let day = date.day;
  return object2(
    toList([
      ["year", int3(year)],
      [
        "month",
        (() => {
          let _pipe = month;
          let _pipe$1 = month_to_int(_pipe);
          return int3(_pipe$1);
        })()
      ],
      ["day", int3(day)]
    ])
  );
}
function encode_line_item(line_item) {
  let item_id = line_item.item_id;
  let quantity = line_item.quantity;
  let unit_price = line_item.unit_price;
  let commission_rate = line_item.commission_rate;
  let discount_rate = line_item.discount_rate;
  return object2(
    toList([
      ["item_id", int3(item_id.inner)],
      ["quantity", int3(quantity.inner)],
      ["unit_price", float2(unit_price.inner)],
      ["commission_rate", float2(commission_rate.inner)],
      ["discount_rate", float2(discount_rate.inner)]
    ])
  );
}
function encode_form(form) {
  let date = form.date;
  let add3 = form.add;
  let remarks = form.remarks;
  let customer_remarks = form.customer_remarks;
  let customer_id = form.customer_id;
  let sales_rep_id = form.sales_rep_id;
  let buyer_name = form.buyer_name;
  let customer_name = form.customer_name;
  let ship_via = form.ship_via;
  let freight_charge = form.freight_charge;
  let warehouse_id = form.warehouse_id;
  let line_items = form.line_items;
  let project_name = form.project_name;
  return object2(
    toList([
      ["date", encode_date(date)],
      ["add", string3(add3)],
      ["remarks", string3(remarks)],
      ["customer_remarks", string3(customer_remarks)],
      ["customer_id", int3(customer_id)],
      ["sales_rep_id", int3(sales_rep_id.inner)],
      ["buyer_name", string3(buyer_name.inner)],
      ["customer_name", string3(customer_name.inner)],
      ["ship_via", string3(ship_via.inner)],
      ["freight_charge", float2(freight_charge.inner)],
      ["warehouse_id", int3(warehouse_id.inner)],
      ["line_items", array2(line_items, encode_line_item)],
      ["project_name", string3(project_name.inner)]
    ])
  );
}
function get_parsed_value(field2, parse3) {
  let $ = field2.parsed_value;
  if ($ instanceof None) {
    let _pipe = field2.value;
    return parse3(_pipe);
  } else {
    let parsed_value = $[0];
    return parsed_value;
  }
}
function update_parsed_value(field2, fun) {
  let _record = field2;
  return new Field(
    _record.value,
    (() => {
      let _pipe = field2;
      let _pipe$1 = get_parsed_value(_pipe, fun);
      return new Some(_pipe$1);
    })()
  );
}
function line_items_dict_to_list(dict2) {
  let _pipe = dict2;
  let _pipe$1 = map_to_list(_pipe);
  return sort(_pipe$1, (a2, b) => {
    return compare2(a2[0], b[0]);
  });
}
function new_field() {
  return new Field("", new None());
}
function init2(_) {
  let _pipe = new Model(
    new_field(),
    new_field(),
    new_field(),
    new_field(),
    new None(),
    new_field(),
    new_field(),
    new_field(),
    new_field(),
    new_field(),
    new_field(),
    new_map(),
    new_field()
  );
  return new$7(_pipe, none());
}
function new_line_item_form() {
  return new LineItemForm(
    new_field(),
    new_field(),
    new_field(),
    new_field(),
    new_field()
  );
}
function update_line_item(model, update5, fun) {
  let line_items = model.line_items;
  let _block;
  let _pipe = line_items;
  _block = upsert(
    _pipe,
    update5,
    (line_item) => {
      let _pipe$1 = line_item;
      let _pipe$2 = lazy_unwrap(_pipe$1, new_line_item_form);
      return fun(_pipe$2);
    }
  );
  let line_items$1 = _block;
  let _record = model;
  return new Model(
    _record.date,
    _record.add,
    _record.remarks,
    _record.customer_remarks,
    _record.customer_id,
    _record.sales_rep_id,
    _record.buyer_name,
    _record.customer_name,
    _record.ship_via,
    _record.freight_charge,
    _record.warehouse_id,
    line_items$1,
    _record.project_name
  );
}
var component_name = "my-form";
function view_input(name3, type_2, on_input2, field2) {
  let value2 = field2.value;
  let parsed_value = field2.parsed_value;
  return div(
    toList([]),
    toList([
      label(
        toList([for$(name3)]),
        toList([text3(name3), text3(": ")])
      ),
      input(
        toList([
          type_(type_2),
          id(name3),
          name(name3),
          on_input(on_input2),
          value(value2)
        ])
      ),
      (() => {
        let _pipe = parsed_value;
        let _pipe$1 = map(
          _pipe,
          (parsed_value2) => {
            let _pipe$12 = parsed_value2;
            let _pipe$2 = map4(
              _pipe$12,
              (_) => {
                return none2();
              }
            );
            let _pipe$3 = map_error(
              _pipe$2,
              (msg) => {
                return p(toList([]), toList([text3(msg)]));
              }
            );
            return unwrap_both(_pipe$3);
          }
        );
        return lazy_unwrap(_pipe$1, none2);
      })()
    ])
  );
}
function view2(model) {
  let date = model.date;
  let add3 = model.add;
  let remarks = model.remarks;
  let customer_remarks = model.customer_remarks;
  let sales_rep_id = model.sales_rep_id;
  let buyer_name = model.buyer_name;
  let customer_name = model.customer_name;
  let ship_via = model.ship_via;
  let freight_charge = model.freight_charge;
  let warehouse_id = model.warehouse_id;
  let line_items = model.line_items;
  let project_name = model.project_name;
  return div(
    toList([]),
    toList([
      element6(
        toList([
          on_change(
            (var0) => {
              return new UserUpdatedCustomerId(var0);
            }
          )
        ]),
        toList([])
      ),
      view_input(
        "date",
        "date",
        (var0) => {
          return new UserUpdatedDate(var0);
        },
        date
      ),
      view_input(
        "add",
        "text",
        (var0) => {
          return new UserUpdatedAdd(var0);
        },
        add3
      ),
      view_input(
        "remarks",
        "text",
        (var0) => {
          return new UserUpdatedRemarks(var0);
        },
        remarks
      ),
      view_input(
        "customer_remarks",
        "text",
        (var0) => {
          return new UserUpdatedCustomerRemarks(var0);
        },
        customer_remarks
      ),
      view_input(
        "sales_rep_id",
        "text",
        (var0) => {
          return new UserUpdatedSalesRepId(var0);
        },
        sales_rep_id
      ),
      view_input(
        "buyer_name",
        "text",
        (var0) => {
          return new UserUpdatedBuyerName(var0);
        },
        buyer_name
      ),
      view_input(
        "customer_name",
        "text",
        (var0) => {
          return new UserUpdatedCustomerName(var0);
        },
        customer_name
      ),
      view_input(
        "ship_via",
        "text",
        (var0) => {
          return new UserUpdatedShipVia(var0);
        },
        ship_via
      ),
      view_input(
        "freight_charge",
        "text",
        (var0) => {
          return new UserUpdatedFreightCharge(var0);
        },
        freight_charge
      ),
      view_input(
        "warehouse_id",
        "text",
        (var0) => {
          return new UserUpdatedWarehouseId(var0);
        },
        warehouse_id
      ),
      view_input(
        "project_name",
        "text",
        (var0) => {
          return new UserUpdatedProjectName(var0);
        },
        project_name
      ),
      div(
        toList([]),
        toList([
          div2(
            toList([]),
            (() => {
              let _pipe = line_items;
              let _pipe$1 = line_items_dict_to_list(_pipe);
              return map2(
                _pipe$1,
                (line_item) => {
                  let line_num = line_item[0];
                  let item_id = line_item[1].item_id;
                  let quantity = line_item[1].quantity;
                  let unit_price = line_item[1].unit_price;
                  let commission_rate = line_item[1].commission_rate;
                  let discount_rate = line_item[1].discount_rate;
                  return [
                    to_string(line_num),
                    div(
                      toList([]),
                      toList([
                        view_input(
                          "item_id",
                          "text",
                          (_capture) => {
                            return new UserUpdatedItemId(line_num, _capture);
                          },
                          item_id
                        ),
                        view_input(
                          "quantity",
                          "text",
                          (_capture) => {
                            return new UserUpdatedQuantity(line_num, _capture);
                          },
                          quantity
                        ),
                        view_input(
                          "unit_price",
                          "text",
                          (_capture) => {
                            return new UserUpdatedUnitPrice(line_num, _capture);
                          },
                          unit_price
                        ),
                        view_input(
                          "commission_rate",
                          "text",
                          (_capture) => {
                            return new UserUpdatedCommissionRate(
                              line_num,
                              _capture
                            );
                          },
                          commission_rate
                        ),
                        view_input(
                          "discount_rate",
                          "text",
                          (_capture) => {
                            return new UserUpdatedDiscountRate(
                              line_num,
                              _capture
                            );
                          },
                          discount_rate
                        ),
                        button(
                          toList([
                            on_click(new UserRemovedLineItem(line_num))
                          ]),
                          toList([text3("Remove")])
                        )
                      ])
                    )
                  ];
                }
              );
            })()
          ),
          button(
            toList([on_click(new UserAddedLineItem())]),
            toList([text3("Add")])
          )
        ])
      ),
      button(
        toList([on_click(new UserClickedSave())]),
        toList([text3("Save")])
      )
    ])
  );
}
var event_name = "change";
var required = "Required";
function non_empty_string_parse(value2) {
  let $ = is_empty(value2);
  if ($) {
    let _pipe = required;
    return new Error(_pipe);
  } else {
    let _pipe = value2;
    let _pipe$1 = new NonEmptyString(_pipe);
    return new Ok(_pipe$1);
  }
}
function date_parse(string5) {
  return try$(
    non_empty_string_parse(string5),
    (_use0) => {
      let string$1 = _use0.inner;
      let _block;
      let $ = (() => {
        let _pipe2 = string$1;
        return split2(_pipe2, "-");
      })();
      if ($.hasLength(3)) {
        let year = $.head;
        let month = $.tail.head;
        let day = $.tail.tail.head;
        _block = try$(
          parse_int(year),
          (year2) => {
            return try$(
              parse_int(month),
              (month2) => {
                return try$(
                  month_from_int(month2),
                  (month3) => {
                    return try$(
                      parse_int(day),
                      (day2) => {
                        return new Ok(new Date2(year2, month3, day2));
                      }
                    );
                  }
                );
              }
            );
          }
        );
      } else {
        _block = new Error(void 0);
      }
      let _pipe = _block;
      return replace_error(_pipe, "Invalid date");
    }
  );
}
function positive_int_parse(string5) {
  return try$(
    (() => {
      let _pipe = string5;
      return non_empty_string_parse(_pipe);
    })(),
    (_use0) => {
      let string$1 = _use0.inner;
      return try$(
        (() => {
          let _pipe = string$1;
          let _pipe$1 = parse_int(_pipe);
          return replace_error(_pipe$1, "Must be an integer");
        })(),
        (int5) => {
          let $ = int5 > 0;
          if ($) {
            let _pipe = int5;
            let _pipe$1 = new PositiveInt(_pipe);
            return new Ok(_pipe$1);
          } else {
            let _pipe = "Must be greater than 0";
            return new Error(_pipe);
          }
        }
      );
    }
  );
}
function non_negative_float_parse(string5) {
  return try$(
    (() => {
      let _pipe = string5;
      return non_empty_string_parse(_pipe);
    })(),
    (_use0) => {
      let string$1 = _use0.inner;
      return try$(
        (() => {
          let _pipe = string$1;
          let _pipe$1 = parse_float(_pipe);
          let _pipe$2 = try_recover(
            _pipe$1,
            (_) => {
              let _pipe$22 = string$1;
              let _pipe$3 = parse_int(_pipe$22);
              return map4(_pipe$3, identity);
            }
          );
          return replace_error(_pipe$2, "Must be a number");
        })(),
        (float4) => {
          let _pipe = float4;
          return non_negative_float_new(_pipe);
        }
      );
    }
  );
}
function update_values(model) {
  let date = model.date;
  let add3 = model.add;
  let remarks = model.remarks;
  let customer_remarks = model.customer_remarks;
  let customer_id = model.customer_id;
  let sales_rep_id = model.sales_rep_id;
  let buyer_name = model.buyer_name;
  let customer_name = model.customer_name;
  let ship_via = model.ship_via;
  let freight_charge = model.freight_charge;
  let warehouse_id = model.warehouse_id;
  let line_items = model.line_items;
  let project_name = model.project_name;
  return new Model(
    (() => {
      let _pipe = date;
      return update_parsed_value(_pipe, date_parse);
    })(),
    (() => {
      let _pipe = add3;
      return update_parsed_value(_pipe, (var0) => {
        return new Ok(var0);
      });
    })(),
    (() => {
      let _pipe = remarks;
      return update_parsed_value(_pipe, (var0) => {
        return new Ok(var0);
      });
    })(),
    (() => {
      let _pipe = customer_remarks;
      return update_parsed_value(_pipe, (var0) => {
        return new Ok(var0);
      });
    })(),
    (() => {
      let _pipe = customer_id;
      return lazy_or(
        _pipe,
        () => {
          let _pipe$1 = required;
          let _pipe$2 = new Error(_pipe$1);
          return new Some(_pipe$2);
        }
      );
    })(),
    (() => {
      let _pipe = sales_rep_id;
      return update_parsed_value(_pipe, positive_int_parse);
    })(),
    (() => {
      let _pipe = buyer_name;
      return update_parsed_value(_pipe, non_empty_string_parse);
    })(),
    (() => {
      let _pipe = customer_name;
      return update_parsed_value(_pipe, non_empty_string_parse);
    })(),
    (() => {
      let _pipe = ship_via;
      return update_parsed_value(_pipe, non_empty_string_parse);
    })(),
    (() => {
      let _pipe = freight_charge;
      return update_parsed_value(_pipe, non_negative_float_parse);
    })(),
    (() => {
      let _pipe = warehouse_id;
      return update_parsed_value(_pipe, positive_int_parse);
    })(),
    (() => {
      let _pipe = line_items;
      return map_values(
        _pipe,
        (_, line_item) => {
          let item_id = line_item.item_id;
          let quantity = line_item.quantity;
          let unit_price = line_item.unit_price;
          let commission_rate = line_item.commission_rate;
          let discount_rate = line_item.discount_rate;
          return new LineItemForm(
            (() => {
              let _pipe$1 = item_id;
              return update_parsed_value(_pipe$1, positive_int_parse);
            })(),
            (() => {
              let _pipe$1 = quantity;
              return update_parsed_value(_pipe$1, positive_int_parse);
            })(),
            (() => {
              let _pipe$1 = unit_price;
              return update_parsed_value(_pipe$1, non_negative_float_parse);
            })(),
            (() => {
              let _pipe$1 = commission_rate;
              return update_parsed_value(_pipe$1, non_negative_float_parse);
            })(),
            (() => {
              let _pipe$1 = discount_rate;
              return update_parsed_value(_pipe$1, non_negative_float_parse);
            })()
          );
        }
      );
    })(),
    (() => {
      let _pipe = project_name;
      return update_parsed_value(_pipe, non_empty_string_parse);
    })()
  );
}
function model_to_form(model) {
  let date = model.date;
  let add3 = model.add;
  let remarks = model.remarks;
  let customer_remarks = model.customer_remarks;
  let customer_id = model.customer_id;
  let sales_rep_id = model.sales_rep_id;
  let buyer_name = model.buyer_name;
  let customer_name = model.customer_name;
  let ship_via = model.ship_via;
  let freight_charge = model.freight_charge;
  let warehouse_id = model.warehouse_id;
  let line_items = model.line_items;
  let project_name = model.project_name;
  return try$(
    (() => {
      let _pipe = date;
      return get_parsed_value(_pipe, date_parse);
    })(),
    (date2) => {
      return try$(
        (() => {
          let _pipe = add3;
          return get_parsed_value(_pipe, (var0) => {
            return new Ok(var0);
          });
        })(),
        (add4) => {
          return try$(
            (() => {
              let _pipe = remarks;
              return get_parsed_value(_pipe, (var0) => {
                return new Ok(var0);
              });
            })(),
            (remarks2) => {
              return try$(
                (() => {
                  let _pipe = customer_remarks;
                  return get_parsed_value(
                    _pipe,
                    (var0) => {
                      return new Ok(var0);
                    }
                  );
                })(),
                (customer_remarks2) => {
                  return try$(
                    (() => {
                      let _pipe = customer_id;
                      return lazy_unwrap(
                        _pipe,
                        () => {
                          let _pipe$1 = required;
                          return new Error(_pipe$1);
                        }
                      );
                    })(),
                    (customer_id2) => {
                      return try$(
                        (() => {
                          let _pipe = sales_rep_id;
                          return get_parsed_value(_pipe, positive_int_parse);
                        })(),
                        (sales_rep_id2) => {
                          return try$(
                            (() => {
                              let _pipe = buyer_name;
                              return get_parsed_value(
                                _pipe,
                                non_empty_string_parse
                              );
                            })(),
                            (buyer_name2) => {
                              return try$(
                                (() => {
                                  let _pipe = customer_name;
                                  return get_parsed_value(
                                    _pipe,
                                    non_empty_string_parse
                                  );
                                })(),
                                (customer_name2) => {
                                  return try$(
                                    (() => {
                                      let _pipe = ship_via;
                                      return get_parsed_value(
                                        _pipe,
                                        non_empty_string_parse
                                      );
                                    })(),
                                    (ship_via2) => {
                                      return try$(
                                        (() => {
                                          let _pipe = freight_charge;
                                          return get_parsed_value(
                                            _pipe,
                                            non_negative_float_parse
                                          );
                                        })(),
                                        (freight_charge2) => {
                                          return try$(
                                            (() => {
                                              let _pipe = warehouse_id;
                                              return get_parsed_value(
                                                _pipe,
                                                positive_int_parse
                                              );
                                            })(),
                                            (warehouse_id2) => {
                                              return try$(
                                                (() => {
                                                  let _pipe = project_name;
                                                  return get_parsed_value(
                                                    _pipe,
                                                    non_empty_string_parse
                                                  );
                                                })(),
                                                (project_name2) => {
                                                  return try$(
                                                    (() => {
                                                      let _pipe = line_items;
                                                      let _pipe$1 = line_items_dict_to_list(
                                                        _pipe
                                                      );
                                                      return try_map(
                                                        _pipe$1,
                                                        (pair) => {
                                                          let item_id = pair[1].item_id;
                                                          let quantity = pair[1].quantity;
                                                          let unit_price = pair[1].unit_price;
                                                          let commission_rate = pair[1].commission_rate;
                                                          let discount_rate = pair[1].discount_rate;
                                                          return try$(
                                                            (() => {
                                                              let _pipe$2 = item_id;
                                                              return get_parsed_value(
                                                                _pipe$2,
                                                                positive_int_parse
                                                              );
                                                            })(),
                                                            (item_id2) => {
                                                              return try$(
                                                                (() => {
                                                                  let _pipe$2 = quantity;
                                                                  return get_parsed_value(
                                                                    _pipe$2,
                                                                    positive_int_parse
                                                                  );
                                                                })(),
                                                                (quantity2) => {
                                                                  return try$(
                                                                    (() => {
                                                                      let _pipe$2 = unit_price;
                                                                      return get_parsed_value(
                                                                        _pipe$2,
                                                                        non_negative_float_parse
                                                                      );
                                                                    })(),
                                                                    (unit_price2) => {
                                                                      return try$(
                                                                        (() => {
                                                                          let _pipe$2 = commission_rate;
                                                                          return get_parsed_value(
                                                                            _pipe$2,
                                                                            non_negative_float_parse
                                                                          );
                                                                        })(),
                                                                        (commission_rate2) => {
                                                                          return try$(
                                                                            (() => {
                                                                              let _pipe$2 = discount_rate;
                                                                              return get_parsed_value(
                                                                                _pipe$2,
                                                                                non_negative_float_parse
                                                                              );
                                                                            })(),
                                                                            (discount_rate2) => {
                                                                              let _pipe$2 = new LineItem(
                                                                                item_id2,
                                                                                quantity2,
                                                                                unit_price2,
                                                                                commission_rate2,
                                                                                discount_rate2
                                                                              );
                                                                              return new Ok(
                                                                                _pipe$2
                                                                              );
                                                                            }
                                                                          );
                                                                        }
                                                                      );
                                                                    }
                                                                  );
                                                                }
                                                              );
                                                            }
                                                          );
                                                        }
                                                      );
                                                    })(),
                                                    (line_items2) => {
                                                      let _pipe = new Form(
                                                        date2,
                                                        add4,
                                                        remarks2,
                                                        customer_remarks2,
                                                        customer_id2,
                                                        sales_rep_id2,
                                                        buyer_name2,
                                                        customer_name2,
                                                        ship_via2,
                                                        freight_charge2,
                                                        warehouse_id2,
                                                        line_items2,
                                                        project_name2
                                                      );
                                                      return new Ok(_pipe);
                                                    }
                                                  );
                                                }
                                              );
                                            }
                                          );
                                        }
                                      );
                                    }
                                  );
                                }
                              );
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}
function update2(model, msg) {
  if (msg instanceof UserClickedSave) {
    let _block;
    let _pipe = model;
    _block = update_values(_pipe);
    let model$1 = _block;
    let _block$1;
    let _pipe$1 = model$1;
    let _pipe$2 = model_to_form(_pipe$1);
    let _pipe$3 = map4(
      _pipe$2,
      (form) => {
        let _pipe$32 = form;
        let _pipe$4 = encode_form(_pipe$32);
        return ((_capture) => {
          return emit(event_name, _capture);
        })(
          _pipe$4
        );
      }
    );
    _block$1 = lazy_unwrap2(_pipe$3, none);
    let effect = _block$1;
    return [model$1, effect];
  } else if (msg instanceof UserUpdatedDate) {
    let value2 = msg[0];
    let _block;
    let _record = model;
    _block = new Model(
      new Field(
        value2,
        (() => {
          let _pipe2 = value2;
          let _pipe$1 = date_parse(_pipe2);
          return new Some(_pipe$1);
        })()
      ),
      _record.add,
      _record.remarks,
      _record.customer_remarks,
      _record.customer_id,
      _record.sales_rep_id,
      _record.buyer_name,
      _record.customer_name,
      _record.ship_via,
      _record.freight_charge,
      _record.warehouse_id,
      _record.line_items,
      _record.project_name
    );
    let _pipe = _block;
    return new$7(_pipe, none());
  } else if (msg instanceof UserUpdatedCustomerId) {
    let value2 = msg[0];
    let _block;
    let _record = model;
    _block = new Model(
      _record.date,
      _record.add,
      _record.remarks,
      _record.customer_remarks,
      (() => {
        let _pipe2 = value2;
        let _pipe$1 = new Ok(_pipe2);
        return new Some(_pipe$1);
      })(),
      _record.sales_rep_id,
      _record.buyer_name,
      _record.customer_name,
      _record.ship_via,
      _record.freight_charge,
      _record.warehouse_id,
      _record.line_items,
      _record.project_name
    );
    let _pipe = _block;
    return new$7(_pipe, none());
  } else if (msg instanceof UserUpdatedItemId) {
    let line_num = msg[0];
    let value2 = msg[1];
    let _pipe = model;
    let _pipe$1 = update_line_item(
      _pipe,
      line_num,
      (line_item) => {
        let _record = line_item;
        return new LineItemForm(
          new Field(
            value2,
            (() => {
              let _pipe$12 = value2;
              let _pipe$2 = positive_int_parse(_pipe$12);
              return new Some(_pipe$2);
            })()
          ),
          _record.quantity,
          _record.unit_price,
          _record.commission_rate,
          _record.discount_rate
        );
      }
    );
    return new$7(_pipe$1, none());
  } else if (msg instanceof UserUpdatedQuantity) {
    let line_num = msg[0];
    let value2 = msg[1];
    let _pipe = model;
    let _pipe$1 = update_line_item(
      _pipe,
      line_num,
      (line_item) => {
        let _record = line_item;
        return new LineItemForm(
          _record.item_id,
          new Field(
            value2,
            (() => {
              let _pipe$12 = value2;
              let _pipe$2 = positive_int_parse(_pipe$12);
              return new Some(_pipe$2);
            })()
          ),
          _record.unit_price,
          _record.commission_rate,
          _record.discount_rate
        );
      }
    );
    return new$7(_pipe$1, none());
  } else if (msg instanceof UserAddedLineItem) {
    let line_items = model.line_items;
    let _block;
    let _pipe = line_items;
    let _pipe$1 = keys(_pipe);
    let _pipe$2 = max(_pipe$1, compare2);
    _block = unwrap(_pipe$2, 0);
    let max_line_num = _block;
    let _block$1;
    let _pipe$3 = line_items;
    _block$1 = insert(_pipe$3, max_line_num + 1, new_line_item_form());
    let line_items$1 = _block$1;
    let _block$2;
    let _record = model;
    _block$2 = new Model(
      _record.date,
      _record.add,
      _record.remarks,
      _record.customer_remarks,
      _record.customer_id,
      _record.sales_rep_id,
      _record.buyer_name,
      _record.customer_name,
      _record.ship_via,
      _record.freight_charge,
      _record.warehouse_id,
      line_items$1,
      _record.project_name
    );
    let _pipe$4 = _block$2;
    return new$7(_pipe$4, none());
  } else if (msg instanceof UserRemovedLineItem) {
    let line_num = msg[0];
    let line_items = model.line_items;
    let _block;
    let _pipe = line_items;
    _block = delete$(_pipe, line_num);
    let line_items$1 = _block;
    let _block$1;
    let _record = model;
    _block$1 = new Model(
      _record.date,
      _record.add,
      _record.remarks,
      _record.customer_remarks,
      _record.customer_id,
      _record.sales_rep_id,
      _record.buyer_name,
      _record.customer_name,
      _record.ship_via,
      _record.freight_charge,
      _record.warehouse_id,
      line_items$1,
      _record.project_name
    );
    let _pipe$1 = _block$1;
    return new$7(_pipe$1, none());
  } else if (msg instanceof UserUpdatedShipVia) {
    let value2 = msg[0];
    let _block;
    let _record = model;
    _block = new Model(
      _record.date,
      _record.add,
      _record.remarks,
      _record.customer_remarks,
      _record.customer_id,
      _record.sales_rep_id,
      _record.buyer_name,
      _record.customer_name,
      new Field(
        value2,
        (() => {
          let _pipe2 = value2;
          let _pipe$1 = non_empty_string_parse(_pipe2);
          return new Some(_pipe$1);
        })()
      ),
      _record.freight_charge,
      _record.warehouse_id,
      _record.line_items,
      _record.project_name
    );
    let _pipe = _block;
    return new$7(_pipe, none());
  } else if (msg instanceof UserUpdatedWarehouseId) {
    let value2 = msg[0];
    let _block;
    let _record = model;
    _block = new Model(
      _record.date,
      _record.add,
      _record.remarks,
      _record.customer_remarks,
      _record.customer_id,
      _record.sales_rep_id,
      _record.buyer_name,
      _record.customer_name,
      _record.ship_via,
      _record.freight_charge,
      new Field(
        value2,
        (() => {
          let _pipe2 = value2;
          let _pipe$1 = positive_int_parse(_pipe2);
          return new Some(_pipe$1);
        })()
      ),
      _record.line_items,
      _record.project_name
    );
    let _pipe = _block;
    return new$7(_pipe, none());
  } else if (msg instanceof UserUpdatedFreightCharge) {
    let value2 = msg[0];
    let _block;
    let _record = model;
    _block = new Model(
      _record.date,
      _record.add,
      _record.remarks,
      _record.customer_remarks,
      _record.customer_id,
      _record.sales_rep_id,
      _record.buyer_name,
      _record.customer_name,
      _record.ship_via,
      new Field(
        value2,
        (() => {
          let _pipe2 = value2;
          let _pipe$1 = non_negative_float_parse(_pipe2);
          return new Some(_pipe$1);
        })()
      ),
      _record.warehouse_id,
      _record.line_items,
      _record.project_name
    );
    let _pipe = _block;
    return new$7(_pipe, none());
  } else if (msg instanceof UserUpdatedProjectName) {
    let value2 = msg[0];
    let _block;
    let _record = model;
    _block = new Model(
      _record.date,
      _record.add,
      _record.remarks,
      _record.customer_remarks,
      _record.customer_id,
      _record.sales_rep_id,
      _record.buyer_name,
      _record.customer_name,
      _record.ship_via,
      _record.freight_charge,
      _record.warehouse_id,
      _record.line_items,
      new Field(
        value2,
        (() => {
          let _pipe2 = value2;
          let _pipe$1 = non_empty_string_parse(_pipe2);
          return new Some(_pipe$1);
        })()
      )
    );
    let _pipe = _block;
    return new$7(_pipe, none());
  } else if (msg instanceof UserUpdatedAdd) {
    let value2 = msg[0];
    let _block;
    let _record = model;
    _block = new Model(
      _record.date,
      new Field(
        value2,
        (() => {
          let _pipe2 = value2;
          let _pipe$1 = new Ok(_pipe2);
          return new Some(_pipe$1);
        })()
      ),
      _record.remarks,
      _record.customer_remarks,
      _record.customer_id,
      _record.sales_rep_id,
      _record.buyer_name,
      _record.customer_name,
      _record.ship_via,
      _record.freight_charge,
      _record.warehouse_id,
      _record.line_items,
      _record.project_name
    );
    let _pipe = _block;
    return new$7(_pipe, none());
  } else if (msg instanceof UserUpdatedRemarks) {
    let value2 = msg[0];
    let _block;
    let _record = model;
    _block = new Model(
      _record.date,
      _record.add,
      new Field(
        value2,
        (() => {
          let _pipe2 = value2;
          let _pipe$1 = new Ok(_pipe2);
          return new Some(_pipe$1);
        })()
      ),
      _record.customer_remarks,
      _record.customer_id,
      _record.sales_rep_id,
      _record.buyer_name,
      _record.customer_name,
      _record.ship_via,
      _record.freight_charge,
      _record.warehouse_id,
      _record.line_items,
      _record.project_name
    );
    let _pipe = _block;
    return new$7(_pipe, none());
  } else if (msg instanceof UserUpdatedCustomerRemarks) {
    let value2 = msg[0];
    let _block;
    let _record = model;
    _block = new Model(
      _record.date,
      _record.add,
      _record.remarks,
      new Field(
        value2,
        (() => {
          let _pipe2 = value2;
          let _pipe$1 = new Ok(_pipe2);
          return new Some(_pipe$1);
        })()
      ),
      _record.customer_id,
      _record.sales_rep_id,
      _record.buyer_name,
      _record.customer_name,
      _record.ship_via,
      _record.freight_charge,
      _record.warehouse_id,
      _record.line_items,
      _record.project_name
    );
    let _pipe = _block;
    return new$7(_pipe, none());
  } else if (msg instanceof UserUpdatedSalesRepId) {
    let value2 = msg[0];
    let _block;
    let _record = model;
    _block = new Model(
      _record.date,
      _record.add,
      _record.remarks,
      _record.customer_remarks,
      _record.customer_id,
      new Field(
        value2,
        (() => {
          let _pipe2 = value2;
          let _pipe$1 = positive_int_parse(_pipe2);
          return new Some(_pipe$1);
        })()
      ),
      _record.buyer_name,
      _record.customer_name,
      _record.ship_via,
      _record.freight_charge,
      _record.warehouse_id,
      _record.line_items,
      _record.project_name
    );
    let _pipe = _block;
    return new$7(_pipe, none());
  } else if (msg instanceof UserUpdatedBuyerName) {
    let value2 = msg[0];
    let _block;
    let _record = model;
    _block = new Model(
      _record.date,
      _record.add,
      _record.remarks,
      _record.customer_remarks,
      _record.customer_id,
      _record.sales_rep_id,
      new Field(
        value2,
        (() => {
          let _pipe2 = value2;
          let _pipe$1 = non_empty_string_parse(_pipe2);
          return new Some(_pipe$1);
        })()
      ),
      _record.customer_name,
      _record.ship_via,
      _record.freight_charge,
      _record.warehouse_id,
      _record.line_items,
      _record.project_name
    );
    let _pipe = _block;
    return new$7(_pipe, none());
  } else if (msg instanceof UserUpdatedCustomerName) {
    let value2 = msg[0];
    let _block;
    let _record = model;
    _block = new Model(
      _record.date,
      _record.add,
      _record.remarks,
      _record.customer_remarks,
      _record.customer_id,
      _record.sales_rep_id,
      _record.buyer_name,
      new Field(
        value2,
        (() => {
          let _pipe2 = value2;
          let _pipe$1 = non_empty_string_parse(_pipe2);
          return new Some(_pipe$1);
        })()
      ),
      _record.ship_via,
      _record.freight_charge,
      _record.warehouse_id,
      _record.line_items,
      _record.project_name
    );
    let _pipe = _block;
    return new$7(_pipe, none());
  } else if (msg instanceof UserUpdatedCommissionRate) {
    let line_num = msg[0];
    let value2 = msg[1];
    let _pipe = model;
    let _pipe$1 = update_line_item(
      _pipe,
      line_num,
      (line_item) => {
        let _record = line_item;
        return new LineItemForm(
          _record.item_id,
          _record.quantity,
          _record.unit_price,
          new Field(
            value2,
            (() => {
              let _pipe$12 = value2;
              let _pipe$2 = non_negative_float_parse(_pipe$12);
              return new Some(_pipe$2);
            })()
          ),
          _record.discount_rate
        );
      }
    );
    return new$7(_pipe$1, none());
  } else if (msg instanceof UserUpdatedDiscountRate) {
    let line_num = msg[0];
    let value2 = msg[1];
    let _pipe = model;
    let _pipe$1 = update_line_item(
      _pipe,
      line_num,
      (line_item) => {
        let _record = line_item;
        return new LineItemForm(
          _record.item_id,
          _record.quantity,
          _record.unit_price,
          _record.commission_rate,
          new Field(
            value2,
            (() => {
              let _pipe$12 = value2;
              let _pipe$2 = non_negative_float_parse(_pipe$12);
              return new Some(_pipe$2);
            })()
          )
        );
      }
    );
    return new$7(_pipe$1, none());
  } else {
    let line_num = msg[0];
    let value2 = msg[1];
    let _pipe = model;
    let _pipe$1 = update_line_item(
      _pipe,
      line_num,
      (line_item) => {
        let _record = line_item;
        return new LineItemForm(
          _record.item_id,
          _record.quantity,
          new Field(
            value2,
            (() => {
              let _pipe$12 = value2;
              let _pipe$2 = non_negative_float_parse(_pipe$12);
              return new Some(_pipe$2);
            })()
          ),
          _record.commission_rate,
          _record.discount_rate
        );
      }
    );
    return new$7(_pipe$1, none());
  }
}
function register() {
  let component2 = component(
    init2,
    update2,
    view2,
    toList([open_shadow_root(true)])
  );
  return make_component(component2, component_name);
}

// build/dev/javascript/client/client/ui/input.mjs
function input2(attributes) {
  return input(
    prepend(class$("lustre-ui-input"), attributes)
  );
}
function container(attributes, children) {
  return div(
    prepend(class$("lustre-ui-input-container"), attributes),
    children
  );
}

// build/dev/javascript/lustre/lustre/element/svg.mjs
var namespace = "http://www.w3.org/2000/svg";
function path(attrs) {
  return namespaced(namespace, "path", attrs, empty_list);
}

// build/dev/javascript/client/client/ui/primitives/icon.mjs
function icon(attrs, path2) {
  return svg(
    prepend(
      attribute2("viewBox", "0 0 15 15"),
      prepend(
        attribute2("fill", "none"),
        prepend(class$("lustre-ui-icon"), attrs)
      )
    ),
    toList([
      path(
        toList([
          attribute2("d", path2),
          attribute2("fill", "currentColor"),
          attribute2("fill-rule", "evenodd"),
          attribute2("clip-rule", "evenodd")
        ])
      )
    ])
  );
}
function chevron_down(attrs) {
  return icon(
    attrs,
    "M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z"
  );
}
function check(attrs) {
  return icon(
    attrs,
    "M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
  );
}
function magnifying_glass(attrs) {
  return icon(
    attrs,
    "M10 6.5C10 8.433 8.433 10 6.5 10C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5ZM9.30884 10.0159C8.53901 10.6318 7.56251 11 6.5 11C4.01472 11 2 8.98528 2 6.5C2 4.01472 4.01472 2 6.5 2C8.98528 2 11 4.01472 11 6.5C11 7.56251 10.6318 8.53901 10.0159 9.30884L12.8536 12.1464C13.0488 12.3417 13.0488 12.6583 12.8536 12.8536C12.6583 13.0488 12.3417 13.0488 12.1464 12.8536L9.30884 10.0159Z"
  );
}

// build/dev/javascript/client/dom.ffi.mjs
var assigned_elements = (slot3) => {
  if (slot3 instanceof HTMLSlotElement) {
    return new Ok(List.fromArray(slot3.assignedElements()));
  }
  return new Error(null);
};
var get_attribute = (element7, name3) => {
  if (!(element7 instanceof HTMLElement)) {
    return new Error(null);
  }
  const attr = element7.getAttribute(name3);
  if (attr === null) {
    return new Error(null);
  }
  return new Ok(attr);
};
var hide_popover = (root3) => {
  if (!(root3 instanceof ShadowRoot)) return;
  const popover2 = root3.querySelector("[popover]");
  if (!popover2) return;
  try {
    popover2.hidePopover();
  } catch (_) {
  }
};

// build/dev/javascript/client/client/ui/combobox.mjs
var Option2 = class extends CustomType {
  constructor(value2, label2, has_content) {
    super();
    this.value = value2;
    this.label = label2;
    this.has_content = has_content;
  }
};
var Model2 = class extends CustomType {
  constructor(value2, query, intent, options2, loading) {
    super();
    this.value = value2;
    this.query = query;
    this.intent = intent;
    this.options = options2;
    this.loading = loading;
  }
};
var ParentChangedChildren = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var UserChangedQuery = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UserHoveredOption = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UserPressedKey = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UserSelectedOption = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
function content_key(value2) {
  return value2 + "-content";
}
function init3(_) {
  return [
    new Model2(new None(), "", new None(), toList([]), false),
    none()
  ];
}
function hide_popover2() {
  return after_paint((_, root3) => {
    return hide_popover(root3);
  });
}
function view_input2(query) {
  return container(
    toList([attribute2("part", "combobox-input")]),
    toList([
      magnifying_glass(toList([])),
      input2(
        toList([
          autofocus(true),
          styles(
            toList([
              ["width", "100%"],
              ["border-bottom-left-radius", "0px"],
              ["border-bottom-right-radius", "0px"]
            ])
          ),
          name("query"),
          autocomplete("off"),
          on_input((var0) => {
            return new UserChangedQuery(var0);
          }),
          on_keydown((var0) => {
            return new UserPressedKey(var0);
          }),
          value(query)
        ])
      )
    ])
  );
}
function view_option(option, value2, intent, last2) {
  let is_selected = isEqual(new Some(option.value), value2);
  let is_intent = isEqual(new Some(option.value), intent);
  let _block;
  if (is_selected) {
    _block = check;
  } else {
    _block = (_capture) => {
      return span(_capture, toList([]));
    };
  }
  let icon2 = _block;
  let parts = toList([
    "combobox-option",
    (() => {
      if (is_intent) {
        return "intent";
      } else {
        return "";
      }
    })(),
    (() => {
      if (last2) {
        return "last";
      } else {
        return "";
      }
    })()
  ]);
  return li(
    toList([
      attribute2("part", join(parts, " ")),
      attribute2("value", option.value),
      on_mouse_over(new UserHoveredOption(option.value)),
      on_mouse_down(new UserSelectedOption(option.value))
    ]),
    toList([
      icon2(
        toList([
          styles(toList([["height", "1rem"], ["width", "1rem"]]))
        ])
      ),
      span(
        toList([style("flex", "1 1 0%")]),
        toList([
          named_slot(
            content_key(option.value),
            toList([]),
            toList([])
          )
        ])
      )
    ])
  );
}
function do_view_options(options2, value2, intent) {
  if (options2.hasLength(0)) {
    return toList([]);
  } else if (options2.hasLength(1)) {
    let option$1 = options2.head;
    return toList([[option$1.value, view_option(option$1, value2, intent, true)]]);
  } else {
    let option$1 = options2.head;
    let rest = options2.tail;
    return prepend(
      [option$1.value, view_option(option$1, value2, intent, false)],
      do_view_options(rest, value2, intent)
    );
  }
}
function view_options(options2, value2, intent) {
  return ul2(toList([]), do_view_options(options2, value2, intent));
}
var name2 = "lustre-ui-combobox";
var option_name = name2 + "-option";
var has_content_attribute = "has_content";
function options(children) {
  return run(
    children,
    list2(
      then$(
        dynamic,
        (child) => {
          return field(
            "tagName",
            string2,
            (tag_name) => {
              return field(
                "textContent",
                string2,
                (text_content) => {
                  return then$(
                    (() => {
                      let $ = get_attribute(child, "value");
                      if ($.isOk()) {
                        let value2 = $[0];
                        let _pipe = value2;
                        return success(_pipe);
                      } else {
                        let _pipe = "";
                        return failure(_pipe, "String");
                      }
                    })(),
                    (value2) => {
                      let _block;
                      let $ = get_attribute(child, "selected");
                      if ($.isOk()) {
                        _block = true;
                      } else {
                        _block = false;
                      }
                      let selected2 = _block;
                      let _block$1;
                      let $1 = get_attribute(child, has_content_attribute);
                      if ($1.isOk()) {
                        _block$1 = true;
                      } else {
                        _block$1 = false;
                      }
                      let has_content = _block$1;
                      return success(
                        [
                          (() => {
                            let _pipe = tag_name;
                            return lowercase(_pipe);
                          })(),
                          value2,
                          text_content,
                          has_content,
                          selected2
                        ]
                      );
                    }
                  );
                }
              );
            }
          );
        }
      )
    )
  );
}
function handle_slot_change() {
  return field(
    "target",
    dynamic,
    (slot3) => {
      return then$(
        (() => {
          let $ = assigned_elements(slot3);
          if ($.isOk()) {
            let children = $[0];
            let _pipe = children;
            return success(_pipe);
          } else {
            let _pipe = nil();
            return failure(_pipe, "Dynamic");
          }
        })(),
        (children) => {
          return then$(
            (() => {
              let $ = options(children);
              if ($.isOk()) {
                let options$1 = $[0];
                let _pipe = options$1;
                return success(_pipe);
              } else {
                let _pipe = toList([]);
                return failure(
                  _pipe,
                  "List(#(String, String, String, Bool))"
                );
              }
            })(),
            (options2) => {
              let _pipe = options2;
              let _pipe$1 = fold_right(
                _pipe,
                [toList([]), new None(), new$()],
                (acc, option) => {
                  let tag = option[0];
                  let value2 = option[1];
                  let label2 = option[2];
                  let has_content = option[3];
                  let selected2 = option[4];
                  return guard(
                    tag !== option_name,
                    acc,
                    () => {
                      return guard(
                        contains(acc[2], value2),
                        acc,
                        () => {
                          let seen = insert2(acc[2], value2);
                          let options$1 = prepend(
                            new Option2(value2, label2, has_content),
                            acc[0]
                          );
                          let _block;
                          let $ = acc[1];
                          if (selected2 && $ instanceof None) {
                            _block = new Some(value2);
                          } else {
                            _block = acc[1];
                          }
                          let selection = _block;
                          return [options$1, selection, seen];
                        }
                      );
                    }
                  );
                }
              );
              let _pipe$2 = ((tuple) => {
                let options$1 = tuple[0];
                let selection = tuple[1];
                return new ParentChangedChildren(options$1, selection);
              })(_pipe$1);
              return success(_pipe$2);
            }
          );
        }
      );
    }
  );
}
var query_key = "query";
var query_event_name = "query";
function emit_query(query) {
  return emit(
    query_event_name,
    object2(toList([[query_key, string3(query)]]))
  );
}
var value_key2 = "value";
var change_event_name = "change";
function emit_change(value2) {
  return emit(
    change_event_name,
    object2(toList([[value_key2, string3(value2)]]))
  );
}
function update3(model, msg) {
  if (msg instanceof ParentChangedChildren) {
    let options$1 = msg[0];
    let selection = msg[1];
    let _block;
    let _pipe = options$1;
    let _pipe$1 = find2(_pipe, (option) => {
      return option.has_content;
    });
    let _pipe$2 = from_result(_pipe$1);
    _block = map(_pipe$2, (option) => {
      return option.value;
    });
    let intent = _block;
    let _block$1;
    let _record = model;
    _block$1 = new Model2(selection, _record.query, intent, options$1, false);
    let model$1 = _block$1;
    let effect = none();
    return [model$1, effect];
  } else if (msg instanceof UserChangedQuery) {
    let query = msg[0];
    let _block;
    let _pipe = query;
    _block = emit_query(_pipe);
    let effect = _block;
    let _block$1;
    let _record = model;
    _block$1 = new Model2(
      _record.value,
      query,
      _record.intent,
      _record.options,
      true
    );
    let model$1 = _block$1;
    return [model$1, effect];
  } else if (msg instanceof UserPressedKey && msg[0] === "Tab") {
    let effect = hide_popover2();
    return [model, effect];
  } else if (msg instanceof UserHoveredOption) {
    let intent = msg[0];
    return [
      (() => {
        let _record = model;
        return new Model2(
          _record.value,
          _record.query,
          new Some(intent),
          _record.options,
          _record.loading
        );
      })(),
      none()
    ];
  } else if (msg instanceof UserPressedKey && msg[0] === "ArrowDown") {
    let _block;
    let $ = model.intent;
    if ($ instanceof Some) {
      let intent2 = $[0];
      let _pipe = model.options;
      _block = fold_until(
        _pipe,
        new None(),
        (acc, option) => {
          if (acc instanceof Some) {
            let _pipe$1 = option.value;
            let _pipe$2 = new Some(_pipe$1);
            return new Stop(_pipe$2);
          } else {
            let _block$12;
            let $1 = option.value === intent2;
            if ($1) {
              let _pipe$12 = "";
              _block$12 = new Some(_pipe$12);
            } else {
              _block$12 = new None();
            }
            let _pipe$1 = _block$12;
            return new Continue(_pipe$1);
          }
        }
      );
    } else {
      let _pipe = model.options;
      let _pipe$1 = first(_pipe);
      let _pipe$2 = from_result(_pipe$1);
      _block = map(_pipe$2, (option) => {
        return option.value;
      });
    }
    let intent = _block;
    let _block$1;
    let _record = model;
    _block$1 = new Model2(
      _record.value,
      _record.query,
      intent,
      _record.options,
      _record.loading
    );
    let model$1 = _block$1;
    let effect = none();
    return [model$1, effect];
  } else if (msg instanceof UserPressedKey && msg[0] === "End") {
    let _block;
    let _pipe = model.options;
    let _pipe$1 = last(_pipe);
    let _pipe$2 = from_result(_pipe$1);
    _block = map(_pipe$2, (option) => {
      return option.value;
    });
    let intent = _block;
    let _block$1;
    let _record = model;
    _block$1 = new Model2(
      _record.value,
      _record.query,
      intent,
      _record.options,
      _record.loading
    );
    let model$1 = _block$1;
    let effect = none();
    return [model$1, effect];
  } else if (msg instanceof UserPressedKey && msg[0] === "Enter") {
    let _block;
    let _record = model;
    _block = new Model2(
      (() => {
        let _pipe = model.intent;
        return or(_pipe, model.value);
      })(),
      _record.query,
      _record.intent,
      _record.options,
      _record.loading
    );
    let model$1 = _block;
    let _block$1;
    let $ = model$1.intent;
    if ($ instanceof Some) {
      let value2 = $[0];
      _block$1 = batch(
        toList([
          (() => {
            let _pipe = value2;
            return emit_change(_pipe);
          })(),
          hide_popover2()
        ])
      );
    } else {
      _block$1 = hide_popover2();
    }
    let effect = _block$1;
    return [model$1, effect];
  } else if (msg instanceof UserPressedKey && msg[0] === "Escape") {
    let effect = hide_popover2();
    return [model, effect];
  } else if (msg instanceof UserPressedKey && msg[0] === "Home") {
    let _block;
    let _pipe = model.options;
    let _pipe$1 = first(_pipe);
    let _pipe$2 = from_result(_pipe$1);
    _block = map(_pipe$2, (option) => {
      return option.value;
    });
    let intent = _block;
    let _block$1;
    let _record = model;
    _block$1 = new Model2(
      _record.value,
      _record.query,
      intent,
      _record.options,
      _record.loading
    );
    let model$1 = _block$1;
    let effect = none();
    return [model$1, effect];
  } else if (msg instanceof UserPressedKey && msg[0] === "ArrowUp") {
    let _block;
    let $ = model.intent;
    if ($ instanceof Some) {
      let intent2 = $[0];
      let _pipe = model.options;
      let _pipe$1 = reverse(_pipe);
      _block = fold_until(
        _pipe$1,
        new None(),
        (acc, option) => {
          if (acc instanceof Some) {
            let _pipe$2 = option.value;
            let _pipe$3 = new Some(_pipe$2);
            return new Stop(_pipe$3);
          } else {
            let _block$12;
            let $1 = option.value === intent2;
            if ($1) {
              let _pipe$22 = "";
              _block$12 = new Some(_pipe$22);
            } else {
              _block$12 = new None();
            }
            let _pipe$2 = _block$12;
            return new Continue(_pipe$2);
          }
        }
      );
    } else {
      let _pipe = model.options;
      let _pipe$1 = last(_pipe);
      let _pipe$2 = from_result(_pipe$1);
      _block = map(_pipe$2, (option) => {
        return option.value;
      });
    }
    let intent = _block;
    let _block$1;
    let _record = model;
    _block$1 = new Model2(
      _record.value,
      _record.query,
      intent,
      _record.options,
      _record.loading
    );
    let model$1 = _block$1;
    let effect = none();
    return [model$1, effect];
  } else if (msg instanceof UserPressedKey) {
    return [model, none()];
  } else {
    let value2 = msg[0];
    let _block;
    let _record = model;
    _block = new Model2(
      (() => {
        let _pipe = value2;
        return new Some(_pipe);
      })(),
      _record.query,
      _record.intent,
      _record.options,
      _record.loading
    );
    let model$1 = _block;
    let effect = batch(
      toList([
        (() => {
          let _pipe = value2;
          return emit_change(_pipe);
        })(),
        hide_popover2()
      ])
    );
    return [model$1, effect];
  }
}
var popovertarget2 = "mypopover";
function view3(model) {
  let _block$1;
  let $ = model.value;
  if ($ instanceof Some) {
    let value2 = $[0];
    let _pipe2 = model.options;
    let _pipe$1 = find2(
      _pipe2,
      (option) => {
        return option.value === value2;
      }
    );
    _block$1 = map4(_pipe$1, (option) => {
      return option.label;
    });
  } else {
    _block$1 = new Error(void 0);
  }
  let _block;
  let _pipe = _block$1;
  _block = unwrap(_pipe, "");
  let label2 = _block;
  return fragment2(
    toList([
      default_slot(
        toList([
          hidden(true),
          on("slotchange", handle_slot_change())
        ]),
        toList([])
      ),
      button(
        toList([popovertarget(popovertarget2)]),
        toList([
          span(
            toList([attribute2("part", "combobox-trigger-label")]),
            toList([text3(label2)])
          ),
          chevron_down(
            toList([attribute2("part", "combobox-trigger-icon")])
          )
        ])
      ),
      div(
        toList([id(popovertarget2), popover("")]),
        toList([
          view_input2(model.query),
          view_options(
            (() => {
              let _pipe$1 = model.options;
              return filter(
                _pipe$1,
                (option) => {
                  return option.has_content;
                }
              );
            })(),
            model.value,
            model.intent
          )
        ])
      )
    ])
  );
}
function register2() {
  let _pipe = component(
    init3,
    update3,
    view3,
    toList([open_shadow_root(true)])
  );
  return make_component(_pipe, name2);
}

// build/dev/javascript/client/client.mjs
var Model3 = class extends CustomType {
  constructor(route2) {
    super();
    this.route = route2;
  }
};
var Post = class extends CustomType {
  constructor(id2, title2, summary, text4) {
    super();
    this.id = id2;
    this.title = title2;
    this.summary = summary;
    this.text = text4;
  }
};
var Index2 = class extends CustomType {
};
var Posts = class extends CustomType {
};
var PostById = class extends CustomType {
  constructor(id2) {
    super();
    this.id = id2;
  }
};
var About = class extends CustomType {
};
var NotFound = class extends CustomType {
  constructor(uri) {
    super();
    this.uri = uri;
  }
};
var UserNavigatedTo = class extends CustomType {
  constructor(route2) {
    super();
    this.route = route2;
  }
};
function parse_route(uri) {
  let $ = path_segments(uri.path);
  if ($.hasLength(0)) {
    return new Index2();
  } else if ($.hasLength(1) && $.head === "") {
    return new Index2();
  } else if ($.hasLength(1) && $.head === "posts") {
    return new Posts();
  } else if ($.hasLength(2) && $.head === "post") {
    let post_id = $.tail.head;
    let $1 = parse_int(post_id);
    if ($1.isOk()) {
      let post_id$1 = $1[0];
      return new PostById(post_id$1);
    } else {
      return new NotFound(uri);
    }
  } else if ($.hasLength(1) && $.head === "about") {
    return new About();
  } else {
    return new NotFound(uri);
  }
}
function href2(route2) {
  let _block;
  if (route2 instanceof Index2) {
    _block = "/";
  } else if (route2 instanceof About) {
    _block = "/about";
  } else if (route2 instanceof Posts) {
    _block = "/posts";
  } else if (route2 instanceof PostById) {
    let post_id = route2.id;
    _block = "/post/" + to_string(post_id);
  } else {
    _block = "/404";
  }
  let url = _block;
  return href(url);
}
function init4(_) {
  let _block;
  let $ = do_initial_uri();
  if ($.isOk()) {
    let uri = $[0];
    _block = parse_route(uri);
  } else {
    _block = new Index2();
  }
  let route2 = _block;
  let model = new Model3(route2);
  let effect = init(
    (uri) => {
      let _pipe = uri;
      let _pipe$1 = parse_route(_pipe);
      return new UserNavigatedTo(_pipe$1);
    }
  );
  return [model, effect];
}
function update4(_, msg) {
  {
    let route2 = msg.route;
    return [new Model3(route2), none()];
  }
}
function view_header_link(target, current, text4) {
  let _block;
  if (current instanceof PostById && target instanceof Posts) {
    _block = true;
  } else {
    _block = isEqual(current, target);
  }
  let is_active = _block;
  return li(
    toList([
      classes(
        toList([
          ["border-transparent border-b-2 hover:border-purple-600", true],
          ["text-purple-600", is_active]
        ])
      )
    ]),
    toList([a(toList([href2(target)]), toList([text3(text4)]))])
  );
}
function title(title2) {
  return h2(
    toList([class$("text-3xl text-purple-800 font-light")]),
    toList([text3(title2)])
  );
}
function leading(text4) {
  return p(
    toList([class$("mt-8 text-lg")]),
    toList([text3(text4)])
  );
}
function paragraph(text4) {
  return p(
    toList([class$("mt-14")]),
    toList([text3(text4)])
  );
}
function view_about() {
  return toList([
    title("Me"),
    paragraph(
      "I document the odd occurrences that catch my attention and rewrite my own\n       narrative along the way. I'm fine being referred to with pronouns."
    ),
    paragraph(
      "If you enjoy these glimpses into my mind, feel free to come back\n       semi-regularly. But not too regularly, you creep."
    )
  ]);
}
function view_not_found() {
  return toList([
    title("Not found"),
    paragraph(
      "You glimpse into the void and see -- nothing?\n       Well that was somewhat expected."
    )
  ]);
}
function link(target, title2) {
  return a(
    toList([
      href2(target),
      class$("text-purple-600 hover:underline cursor-pointer")
    ]),
    toList([text3(title2)])
  );
}
function view_index() {
  return toList([
    title("Hello, Joe"),
    leading(
      "Or whoever you may be! This is were I will share random ramblings\n       and thoughts about life."
    ),
    p(
      toList([class$("mt-14")]),
      toList([
        text3(
          "There is not much going on at the moment, but you can still "
        ),
        link(new Posts(), "read my ramblings ->")
      ])
    ),
    element4(toList([]), toList([])),
    paragraph("If you like <3")
  ]);
}
var posts = /* @__PURE__ */ toList([
  /* @__PURE__ */ new Post(
    1,
    "The Empty Chair",
    "A guide to uninvited furniture and its temporal implications",
    "\n      There's an empty chair in my home that wasn't there yesterday. When I sit\n      in it, I start to remember things that haven't happened yet. The chair is\n      getting closer to my bedroom each night, though I never caught it move.\n      Last night, I dreamt it was watching me sleep. This morning, it offered\n      me coffee.\n    "
  ),
  /* @__PURE__ */ new Post(
    2,
    "The Library of Unwritten Books",
    "Warning: Reading this may shorten your narrative arc",
    "\n      Between the shelves in the public library exists a thin space where\n      books that were never written somehow exist. Their pages change when you\n      blink. Forms shifting to match the souls blueprint. Librarians warn\n      against reading the final chapter of any unwritten book \u2013 those who do\n      find their own stories mysteriously concluding. Yourself is just another\n      draft to be rewritten.\n    "
  ),
  /* @__PURE__ */ new Post(
    3,
    "The Hum",
    "A frequency analysis of the collective forgetting",
    "\n      The citywide hum started Tuesday. Not everyone can hear it, but those who\n      can't are slowly being replaced by perfect copies who smile too widely.\n      The hum isn't sound \u2013 it's the universe forgetting our coordinates.\n      Reports suggest humming back in harmony might postpone whatever comes\n      next. Or perhaps accelerate it.\n    "
  )
]);
function view_posts() {
  let _block;
  let _pipe = posts;
  let _pipe$1 = sort(
    _pipe,
    (a2, b) => {
      return compare2(a2.id, b.id);
    }
  );
  _block = map2(
    _pipe$1,
    (post) => {
      return article(
        toList([class$("mt-14")]),
        toList([
          h3(
            toList([class$("text-xl text-purple-600 font-light")]),
            toList([
              a(
                toList([
                  class$("hover:underline"),
                  href2(new PostById(post.id))
                ]),
                toList([text3(post.title)])
              )
            ])
          ),
          p(
            toList([class$("mt-1")]),
            toList([text3(post.summary)])
          )
        ])
      );
    }
  );
  let posts$1 = _block;
  return prepend(title("Posts"), posts$1);
}
function view_post(post_id) {
  let $ = find2(posts, (post) => {
    return post.id === post_id;
  });
  if (!$.isOk()) {
    return view_not_found();
  } else {
    let post = $[0];
    return toList([
      article(
        toList([]),
        toList([title(post.title), leading(post.summary), paragraph(post.text)])
      ),
      p(
        toList([class$("mt-14")]),
        toList([link(new Posts(), "<- Go back?")])
      )
    ]);
  }
}
function view4(model) {
  return div(
    toList([class$("mx-auto max-w-2xl px-32")]),
    toList([
      nav(
        toList([class$("flex justify-between items-center my-16")]),
        toList([
          h1(
            toList([class$("text-purple-600 font-medium text-xl")]),
            toList([
              a(
                toList([href2(new Index2())]),
                toList([text3("My little Blog")])
              )
            ])
          ),
          ul(
            toList([class$("flex space-x-8")]),
            toList([
              view_header_link(new Posts(), model.route, "Posts"),
              view_header_link(new About(), model.route, "About")
            ])
          )
        ])
      ),
      main(
        toList([class$("my-16")]),
        (() => {
          let $ = model.route;
          if ($ instanceof Index2) {
            return view_index();
          } else if ($ instanceof Posts) {
            return view_posts();
          } else if ($ instanceof PostById) {
            let post_id = $.id;
            return view_post(post_id);
          } else if ($ instanceof About) {
            return view_about();
          } else {
            return view_not_found();
          }
        })()
      )
    ])
  );
}
function main2() {
  let app = application(init4, update4, view4);
  let $ = register();
  if (!$.isOk()) {
    throw makeError(
      "let_assert",
      "client",
      21,
      "main",
      "Pattern match failed, no pattern matched the value.",
      { value: $ }
    );
  }
  let $1 = register2();
  if (!$1.isOk()) {
    throw makeError(
      "let_assert",
      "client",
      22,
      "main",
      "Pattern match failed, no pattern matched the value.",
      { value: $1 }
    );
  }
  let $2 = start3(app, "#app", void 0);
  if (!$2.isOk()) {
    throw makeError(
      "let_assert",
      "client",
      23,
      "main",
      "Pattern match failed, no pattern matched the value.",
      { value: $2 }
    );
  }
  return void 0;
}

// build/.lustre/entry.mjs
main2();
