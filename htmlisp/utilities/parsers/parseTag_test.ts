import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseTag } from "./parseTag.ts";
import { asGenerator } from "./utils.ts";

Deno.test("content", () => {
  assertEquals(
    parseTag(asGenerator(`foobar`)()),
    [{ type: "", attributes: {}, children: ["foobar"] }],
  );
});

Deno.test("self-closing tag", () => {
  assertEquals(
    parseTag(asGenerator(`<a />`)()),
    [{ type: "a", attributes: {}, children: null }],
  );
});

Deno.test("self-closing tag with a single attribute", () => {
  assertEquals(
    parseTag(asGenerator(`<a href="test" />`)()),
    [{ type: "a", attributes: { href: "test" }, children: null }],
  );
});

Deno.test("self-closing tag with attributes", () => {
  assertEquals(
    parseTag(asGenerator(`<a href="test" title="foobar" />`)()),
    [{
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: null,
    }],
  );
});

Deno.test("parse tag", () => {
  assertEquals(
    parseTag(asGenerator(`<a href="test" title="foobar"></a>`)()),
    [{
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: null,
    }],
  );
});

Deno.test("parse tag with content", () => {
  assertEquals(
    parseTag(asGenerator(`<a href="test" title="foobar">barfoo</a>`)()),
    [{
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: ["foobar"],
    }],
  );
});

Deno.test("parse tag with another tag", () => {
  assertEquals(
    parseTag(
      asGenerator(`<a href="test" title="foobar"><span>barfoo</span></a>`)(),
    ),
    [{
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: [{
        type: "span",
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
    [{ type: "a", attributes: { href: "test", title: "foobar" } }, {
      type: "a",
      attributes: { href: "test", title: "foobar" },
    }],
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

Deno.test("doctype", () => {
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
    }, {
      type: "a",
      attributes: { href: "test", title: "foobar" },
    }, {
      type: "a",
      attributes: { href: "test", title: "foobar" },
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
    }],
  );
});
