import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("basic element", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<div>foo</div>` }),
    `<div>foo</div>`,
  );
});

Deno.test("nested element", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<div><span>foo</span></div>` }),
    `<div><span>foo</span></div>`,
  );
});

Deno.test("element with an attribute", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<div title="bar">foo</div>` }),
    `<div title="bar">foo</div>`,
  );
});

Deno.test("element with multiple attributes", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<div title="bar" alt="foo">foo</div>` }),
    `<div title="bar" alt="foo">foo</div>`,
  );
});

Deno.test("element with a class", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<div class="bar">foo</div>` }),
    `<div class="bar">foo</div>`,
  );
});

Deno.test("doctype", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: "<!DOCTYPE html>" }),
    "<!DOCTYPE html>",
  );
});

Deno.test("doctype and content", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<!DOCTYPE html>
    <div>hello</div>`,
    }),
    `<!DOCTYPE html>
    <div>hello</div>`,
  );
});

Deno.test("xml", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: '<?xml version="1.0" encoding="utf-8" ?>',
    }),
    '<?xml version="1.0" encoding="utf-8" ?>',
  );
});
