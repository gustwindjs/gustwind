import assert from "node:assert/strict";
import test from "node:test";
import { htmlispToHTMLSync } from "../mod.ts";

test("basic element with siblings as children", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput:
        `<div title="demo"><span>foobar</span><span>barfoo</span></div>`,
    }),
    `<div title="demo"><span>foobar</span><span>barfoo</span></div>`,
  );
});

test("basic element with siblings as children 2", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<div
      title="demo"
    >
      <span>foobar</span>
      <span>barfoo</span>
</div>`,
    }),
    `<div title="demo"><span>foobar</span><span>barfoo</span></div>`,
  );
});

test("basic element with siblings as children 3", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<div
      title="demo"
    >
      <span title="demo">foobar</span>
      <span>barfoo</span>
</div>`,
    }),
    `<div title="demo"><span title="demo">foobar</span><span>barfoo</span></div>`,
  );
});

test("self-closing siblings", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<head>
  <link rel="icon" />
  <link rel="preload" />
</head>
`,
    }),
    `<head><link rel="icon"></link><link rel="preload"></link></head>`,
  );
});

test("siblings only", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<div class="bar">foo</div><div class="bar">foo</div>`,
    }),
    `<div class="bar">foo</div><div class="bar">foo</div>`,
  );
});

test("siblings only with former children", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput:
        `<div class="bar"><span>foo</span></div><div class="bar">foo</div>`,
    }),
    `<div class="bar"><span>foo</span></div><div class="bar">foo</div>`,
  );
});

test("siblings only with latter children", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput:
        `<div class="bar">foo</div><div class="bar"><span>foo</span></div>`,
    }),
    `<div class="bar">foo</div><div class="bar"><span>foo</span></div>`,
  );
});

test("siblings only with children", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput:
        `<div class="bar"><span>foo</span></div><div class="bar"><span>foo</span></div>`,
    }),
    `<div class="bar"><span>foo</span></div><div class="bar"><span>foo</span></div>`,
  );
});
