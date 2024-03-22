import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseTag } from "./parseTag.ts";
import { asGenerator } from "./utils.ts";

Deno.test("content", () => {
  assertEquals(
    parseTag(asGenerator(`foobar`)()),
    ["foobar"],
  );
});

Deno.test("self-closing tag", () => {
  assertEquals(
    parseTag(asGenerator(`<a />`)()),
    [{ type: "a", attributes: {}, children: [] }],
  );
});

Deno.test("multiple self-closing tags", () => {
  assertEquals(
    parseTag(asGenerator(`<a /><a />`)()),
    [{ type: "a", attributes: {}, children: [] }, {
      type: "a",
      attributes: {},
      children: [],
    }],
  );
});

Deno.test("self-closing tag with a single attribute", () => {
  assertEquals(
    parseTag(asGenerator(`<a href="test" />`)()),
    [{ type: "a", attributes: { href: "test" }, children: [] }],
  );
});

Deno.test("self-closing tag with attributes", () => {
  assertEquals(
    parseTag(asGenerator(`<a href="test" title="foobar" />`)()),
    [{
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: [],
    }],
  );
});

Deno.test("simple tag", () => {
  assertEquals(
    parseTag(asGenerator(`<span>foobar</span>`)()),
    [{
      type: "span",
      children: ["foobar"],
      attributes: {},
    }],
  );
});

Deno.test("simple tag with an attribute at the end", () => {
  assertEquals(
    parseTag(asGenerator(`<span title>foobar</span>`)()),
    [{
      type: "span",
      children: ["foobar"],
      attributes: { title: null },
    }],
  );
});

Deno.test("simple tag with attributes", () => {
  assertEquals(
    parseTag(asGenerator(`<a href="test" title="foobar"></a>`)()),
    [{
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: [],
    }],
  );
});

Deno.test("simple tag with content", () => {
  assertEquals(
    parseTag(asGenerator(`<a href="test" title="foobar">barfoo</a>`)()),
    [{
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: ["barfoo"],
    }],
  );
});

Deno.test("simple tag with another tag", () => {
  assertEquals(
    parseTag(
      asGenerator(`<a href="test" title="foobar"><span>barfoo</span></a>`)(),
    ),
    [{
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: [{
        type: "span",
        attributes: {},
        children: ["barfoo"],
      }],
    }],
  );
});

Deno.test("self-closing siblings", () => {
  assertEquals(
    parseTag(
      asGenerator(
        `<a href="test" title="foobar" /><a href="test" title="foobar" />`,
      )(),
    ),
    [
      {
        type: "a",
        attributes: { href: "test", title: "foobar" },
        children: [],
      },
      {
        type: "a",
        attributes: { href: "test", title: "foobar" },
        children: [],
      },
    ],
  );
});

Deno.test("sibling tags", () => {
  assertEquals(
    parseTag(
      asGenerator(
        `<a href="test" title="foobar">foo</a><a href="test" title="foobar">bar</a>`,
      )(),
    ),
    [{
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: ["foo"],
    }, {
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: ["bar"],
    }],
  );
});

Deno.test("simple doctype", () => {
  assertEquals(
    parseTag(asGenerator(`<!DOCTYPE html>`)()),
    [{
      type: "!DOCTYPE",
      attributes: { html: null },
      closesWith: "",
      children: [],
    }],
  );
});

Deno.test("full doctype", () => {
  assertEquals(
    parseTag(
      asGenerator(
        `<!DOCTYPE html>
        <a href="test" title="foobar" /><a href="test" title="foobar" />`,
      )(),
    ),
    [{
      type: "!DOCTYPE",
      attributes: { html: null },
      closesWith: "",
      children: [],
    }, {
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: [],
    }, {
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: [],
    }],
  );
});

Deno.test("xml", () => {
  assertEquals(
    parseTag(
      asGenerator(
        `<?xml version="1.0" encoding="utf-8" ?>`,
      )(),
    ),
    [{
      type: "?xml",
      attributes: { version: "1.0", encoding: "utf-8" },
      closesWith: "?",
      children: [],
    }],
  );
});
