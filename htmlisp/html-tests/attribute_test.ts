import assert from "node:assert/strict";
import test from "node:test";
import { htmlispToHTML } from "../mod.ts";

test("basic element with a newline and an attribute", async () => {
  assert.deepEqual(
    await htmlispToHTML({
      htmlInput: `<div
    title="foobar">foo</div>`,
    }),
    `<div title="foobar">foo</div>`,
  );
});

test("element with an attribute", async () => {
  assert.deepEqual(
    await htmlispToHTML({ htmlInput: `<div title="bar">foo</div>` }),
    `<div title="bar">foo</div>`,
  );
});

test("element with an attribute flag", async () => {
  assert.deepEqual(
    await htmlispToHTML({ htmlInput: `<div title>foo</div>` }),
    `<div title>foo</div>`,
  );
});

test("element with a self-closing attribute", async () => {
  assert.deepEqual(
    await htmlispToHTML({ htmlInput: `<div demo title="bar">foo</div>` }),
    `<div demo title="bar">foo</div>`,
  );
});

test("element with a self-closing attribute at the end", async () => {
  assert.deepEqual(
    await htmlispToHTML({ htmlInput: `<div title="bar" demo>foo</div>` }),
    `<div title="bar" demo>foo</div>`,
  );
});

test("self-closing element with an attribute", async () => {
  assert.deepEqual(
    await htmlispToHTML({ htmlInput: `<div title="bar" />` }),
    `<div title="bar"></div>`,
  );
});

test("self-closing element with a self-closing attribute", async () => {
  assert.deepEqual(
    await htmlispToHTML({ htmlInput: `<div demo title="bar" />` }),
    `<div demo title="bar"></div>`,
  );
});

test("self-closing element with a self-closing attribute at the end", async () => {
  assert.deepEqual(
    await htmlispToHTML({ htmlInput: `<div title="bar" demo />` }),
    `<div title="bar" demo></div>`,
  );
});

test("element with multiple attributes", async () => {
  assert.deepEqual(
    await htmlispToHTML({
      htmlInput: `<div title="bar" alt="foo">foo</div>`,
    }),
    `<div title="bar" alt="foo">foo</div>`,
  );
});

test("element with single quotes in an attribute", async () => {
  assert.deepEqual(
    await htmlispToHTML({
      htmlInput: `<div title="b'a'r" alt="foo">foo</div>`,
    }),
    `<div title="b'a'r" alt="foo">foo</div>`,
  );
});

test("element with ' attributes", async () => {
  assert.deepEqual(
    await htmlispToHTML({
      htmlInput: `<div
    example='<a &href="(concat / foobar)">Link goes here</a>'
  >
    <div x="compileHTML(state.code)"></div>
  </div>`,
    }),
    `<div example="<a &href=\"(concat / foobar)\">Link goes here</a>"><div x="compileHTML(state.code)"></div></div>`,
  );
});
