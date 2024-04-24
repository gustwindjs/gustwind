import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("basic element with siblings as children", () => {
  assertEquals(
    htmlispToHTML({
      htmlInput:
        `<div title="demo"><span>foobar</span><span>barfoo</span></div>`,
    }),
    `<div title="demo"><span>foobar</span><span>barfoo</span></div>`,
  );
});

Deno.test("basic element with siblings as children 2", () => {
  assertEquals(
    htmlispToHTML({
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

Deno.test("basic element with siblings as children 3", () => {
  assertEquals(
    htmlispToHTML({
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

Deno.test("self-closing siblings", () => {
  assertEquals(
    htmlispToHTML({
      htmlInput: `<head>
  <link rel="icon" />
  <link rel="preload" />
</head>
`,
    }),
    `<head><link rel="icon"></link><link rel="preload"></link></head>`,
  );
});

Deno.test("siblings only", () => {
  assertEquals(
    htmlispToHTML({
      htmlInput: `<div class="bar">foo</div><div class="bar">foo</div>`,
    }),
    `<div class="bar">foo</div><div class="bar">foo</div>`,
  );
});

Deno.test("siblings only with former children", () => {
  assertEquals(
    htmlispToHTML({
      htmlInput:
        `<div class="bar"><span>foo</span></div><div class="bar">foo</div>`,
    }),
    `<div class="bar"><span>foo</span></div><div class="bar">foo</div>`,
  );
});

Deno.test("siblings only with latter children", () => {
  assertEquals(
    htmlispToHTML({
      htmlInput:
        `<div class="bar">foo</div><div class="bar"><span>foo</span></div>`,
    }),
    `<div class="bar">foo</div><div class="bar"><span>foo</span></div>`,
  );
});

Deno.test("siblings only with children", () => {
  assertEquals(
    htmlispToHTML({
      htmlInput:
        `<div class="bar"><span>foo</span></div><div class="bar"><span>foo</span></div>`,
    }),
    `<div class="bar"><span>foo</span></div><div class="bar"><span>foo</span></div>`,
  );
});
