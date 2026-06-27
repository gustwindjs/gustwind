import assert from "node:assert/strict";
import test from "node:test";
import type { Components, Element } from "../types.ts";
import {
  assertNamedSlots,
  createForeachProps,
  createRenderContext,
  getComponentOrThrow,
  getForeachItems,
  isComponentTag,
  isHidden,
} from "./astToHTMLShared.ts";

function withMutedConsoleError(fn: () => void) {
  const originalConsoleError = console.error;

  console.error = () => {};

  try {
    fn();
  } finally {
    console.error = originalConsoleError;
  }
}

function captureConsoleError(fn: () => void) {
  const originalConsoleError = console.error;
  const calls: unknown[][] = [];

  console.error = (...args: unknown[]) => {
    calls.push(args);
  };

  try {
    fn();
  } finally {
    console.error = originalConsoleError;
  }

  return calls;
}

test("createForeachProps exposes array items only through value and alias", () => {
  assert.deepEqual(createForeachProps({ existing: true }, ["a"], "item"), {
    existing: true,
    value: ["a"],
    item: ["a"],
  });
});

test("createForeachProps spreads object item properties", () => {
  assert.deepEqual(
    createForeachProps({ existing: true }, { title: "Hello" }, "item"),
    {
      existing: true,
      value: { title: "Hello" },
      title: "Hello",
      item: { title: "Hello" },
    },
  );
});

test("createForeachProps does not spread primitive or function item properties", () => {
  function item() {
    return "value";
  }

  Object.assign(item, { title: "Hidden" });

  assert.deepEqual(createForeachProps({}, "hi"), {
    value: "hi",
  });
  assert.deepEqual(createForeachProps({}, item), {
    value: item,
  });
});

test("getForeachItems rejects non-array foreach values", () => {
  withMutedConsoleError(() => {
    assert.throws(
      () => getForeachItems({ foreach: "not-array" }),
      { message: "foreach - Tried to iterate a non-array!" },
    );
  });
});

test("getComponentOrThrow rejects missing components", () => {
  const tag: Element = { type: "Missing", attributes: {}, children: [] };
  const ast = [tag];
  const renderContext = createRenderContext(
    ast,
    () => "",
    undefined,
    undefined,
    undefined,
    undefined,
    {},
    undefined,
    ["parent"],
  );

  withMutedConsoleError(() => {
    assert.throws(
      () => getComponentOrThrow(tag, renderContext),
      { message: 'Component "Missing" was not found!' },
    );
  });
});

test("getComponentOrThrow logs rendering context for missing components", () => {
  const tag: Element = { type: "Missing", attributes: {}, children: [] };
  const ast = [tag];
  const parentAst = ["parent"];
  const renderContext = createRenderContext(
    ast,
    () => "",
    undefined,
    undefined,
    undefined,
    undefined,
    {},
    undefined,
    parentAst,
  );

  const calls = captureConsoleError(() => {
    assert.throws(() => getComponentOrThrow(tag, renderContext));
  });

  assert.deepEqual(calls, [[{ parentAst, ast }]]);
});

test("isComponentTag accepts capitalized non-all-caps component names", () => {
  const components = {
    Button: "<button></button>",
  } satisfies Components;

  assert.equal(isComponentTag("Button", components), true);
});

test("isComponentTag rejects special, all-caps, and empty tag names", () => {
  const components = {
    "!DOCTYPE": "",
    "!Button": "",
    "?xml": "",
    HTML: "",
    "": "",
  } satisfies Components;

  assert.equal(isComponentTag("!DOCTYPE", components), false);
  assert.equal(isComponentTag("!Button", components), false);
  assert.equal(isComponentTag("?xml", components), false);
  assert.equal(isComponentTag("HTML", components), false);
  assert.equal(isComponentTag("", components), false);
});

test("isHidden treats false, undefined, and empty arrays as hidden", () => {
  assert.equal(isHidden({ visibleIf: false }), true);
  assert.equal(isHidden({ visibleIf: undefined }), true);
  assert.equal(isHidden({ visibleIf: [] }), true);
});

test("isHidden treats null as visible", () => {
  assert.equal(isHidden({ visibleIf: null }), false);
});

test("assertNamedSlots rejects unnamed slots", () => {
  assert.throws(
    () => assertNamedSlots([[null, "content"]]),
    { message: "Slot is missing a name!" },
  );
});

test("assertNamedSlots accepts named slots", () => {
  assert.doesNotThrow(() => assertNamedSlots([["main", "content"]]));
});
