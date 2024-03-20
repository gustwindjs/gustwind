import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("basic element", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<div>foo</div>` }),
    `<div>foo</div>`,
  );
});

Deno.test("basic element with a newline", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div
    >foo</div>`,
    }),
    `<div>foo</div>`,
  );
});

Deno.test("basic element with a single child", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div
    ><span>foo</span></div>`,
    }),
    `<div><span>foo</span></div>`,
  );
});

Deno.test("basic element with nested children", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div
    ><div><span>foo</span></div></div>`,
    }),
    `<div><div><span>foo</span></div></div>`,
  );
});

Deno.test("basic element with a child with a title", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div title="demo"><span title="demo">foobar</span></div>`,
    }),
    `<div title="demo"><span title="demo">foobar</span></div>`,
  );
});

Deno.test("basic element with newlines and nesting", async () => {
  assertEquals(
    await htmlispToHTML({
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

Deno.test("nested element", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<div><span>foo</span></div>` }),
    `<div><span>foo</span></div>`,
  );
});

Deno.test("element with a class", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<div class="bar">foo</div>` }),
    `<div class="bar">foo</div>`,
  );
});
