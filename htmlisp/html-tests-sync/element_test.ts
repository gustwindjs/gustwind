import assert from "node:assert/strict";
import test from "node:test";
import { htmlispToHTMLSync } from "../mod.ts";

test("basic element", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({ htmlInput: `<div>foo</div>` }),
    `<div>foo</div>`,
  );
});

test("basic element with a newline", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<div
    >foo</div>`,
    }),
    `<div>foo</div>`,
  );
});

test("basic element with a single child", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<div
    ><span>foo</span></div>`,
    }),
    `<div><span>foo</span></div>`,
  );
});

test("basic element with nested children", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<div
    ><div><span>foo</span></div></div>`,
    }),
    `<div><div><span>foo</span></div></div>`,
  );
});

test("basic element with a child with a title", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<div title="demo"><span title="demo">foobar</span></div>`,
    }),
    `<div title="demo"><span title="demo">foobar</span></div>`,
  );
});

test("basic element with newlines and nesting", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<div
      title="demo"
    >
      <span>foobar</span>
      <a
        href="#foo"
        >🔗</a
      >
</div>`,
    }),
    `<div title="demo"><span>foobar</span><a href="#foo">🔗</a></div>`,
  );
});

test("nested element", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({ htmlInput: `<div><span>foo</span></div>` }),
    `<div><span>foo</span></div>`,
  );
});

test("element with a class", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({ htmlInput: `<div class="bar">foo</div>` }),
    `<div class="bar">foo</div>`,
  );
});
