import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("basic element with a newline and an attribute", () => {
  assertEquals(
    htmlispToHTML({
      htmlInput: `<div
    title="foobar">foo</div>`,
    }),
    `<div title="foobar">foo</div>`,
  );
});

Deno.test("element with an attribute", () => {
  assertEquals(
    htmlispToHTML({ htmlInput: `<div title="bar">foo</div>` }),
    `<div title="bar">foo</div>`,
  );
});

Deno.test("element with an attribute flag", () => {
  assertEquals(
    htmlispToHTML({ htmlInput: `<div title>foo</div>` }),
    `<div title>foo</div>`,
  );
});

Deno.test("element with a self-closing attribute", () => {
  assertEquals(
    htmlispToHTML({ htmlInput: `<div demo title="bar">foo</div>` }),
    `<div demo title="bar">foo</div>`,
  );
});

Deno.test("element with a self-closing attribute at the end", () => {
  assertEquals(
    htmlispToHTML({ htmlInput: `<div title="bar" demo>foo</div>` }),
    `<div title="bar" demo>foo</div>`,
  );
});

Deno.test("self-closing element with an attribute", () => {
  assertEquals(
    htmlispToHTML({ htmlInput: `<div title="bar" />` }),
    `<div title="bar"></div>`,
  );
});

Deno.test("self-closing element with a self-closing attribute", () => {
  assertEquals(
    htmlispToHTML({ htmlInput: `<div demo title="bar" />` }),
    `<div demo title="bar"></div>`,
  );
});

Deno.test("self-closing element with a self-closing attribute at the end", () => {
  assertEquals(
    htmlispToHTML({ htmlInput: `<div title="bar" demo />` }),
    `<div title="bar" demo></div>`,
  );
});

Deno.test("element with multiple attributes", () => {
  assertEquals(
    htmlispToHTML({ htmlInput: `<div title="bar" alt="foo">foo</div>` }),
    `<div title="bar" alt="foo">foo</div>`,
  );
});

Deno.test("element with single quotes in an attribute", () => {
  assertEquals(
    htmlispToHTML({
      htmlInput: `<div title="b'a'r" alt="foo">foo</div>`,
    }),
    `<div title="b'a'r" alt="foo">foo</div>`,
  );
});

Deno.test("element with ' attributes", () => {
  assertEquals(
    htmlispToHTML({
      htmlInput: `<div
    example='<a &href="(concat / foobar)">Link goes here</a>'
  >
    <div x="compileHTML(state.code)"></div>
  </div>`,
    }),
    `<div example="<a &href=\"(concat / foobar)\">Link goes here</a>"><div x="compileHTML(state.code)"></div></div>`,
  );
});
