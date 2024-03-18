import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("basic element with a newline and an attribute", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div
    title="foobar">foo</div>`,
    }),
    `<div title="foobar">foo</div>`,
  );
});

Deno.test("element with an attribute", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<div title="bar">foo</div>` }),
    `<div title="bar">foo</div>`,
  );
});

Deno.test("element with a self-closing attribute", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<div demo title="bar">foo</div>` }),
    `<div demo title="bar">foo</div>`,
  );
});

Deno.test("element with a self-closing attribute at the end", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<div title="bar" demo>foo</div>` }),
    `<div title="bar" demo>foo</div>`,
  );
});

Deno.test("self-closing element with an attribute", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<div title="bar" />` }),
    `<div title="bar"/>`,
  );
});

Deno.test("self-closing element with a self-closing attribute", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<div demo title="bar" />` }),
    `<div demo title="bar"/>`,
  );
});

Deno.test("self-closing element with a self-closing attribute at the end", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<div title="bar" demo />` }),
    `<div title="bar" demo/>`,
  );
});

Deno.test("element with multiple attributes", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<div title="bar" alt="foo">foo</div>` }),
    `<div title="bar" alt="foo">foo</div>`,
  );
});

Deno.test("element with ' attributes", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<CodeEditor
    example='<a &href="(concat / breezewind)">Link goes here</a>'
  >
    <div x="compileHTML(state.code)"></div>
  </CodeEditor>`,
    }),
    `<CodeEditor example='<a &href="(concat / breezewind)">Link goes here</a>'><div x="compileHTML(state.code)"></div></CodeEditor>`,
  );
});
