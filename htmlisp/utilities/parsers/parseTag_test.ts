import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseTag } from "./parseTag.ts";
import { asGenerator } from "./utils.ts";

Deno.test("self-closing parse tag", () => {
  assertEquals(
    parseTag(asGenerator(`<a href="test" title="foobar" />`)()),
    { type: "a", attributes: { href: "test", title: "foobar" } },
  );
});

Deno.test("parse tag", () => {
  assertEquals(
    parseTag(asGenerator(`<a href="test" title="foobar"></a>`)()),
    { type: "a", attributes: { href: "test", title: "foobar" } },
  );
});

Deno.test("parse tag with content", () => {
  assertEquals(
    parseTag(asGenerator(`<a href="test" title="foobar">barfoo</a>`)()),
    {
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: ["foobar"],
    },
  );
});

Deno.test("parse tag with another tag", () => {
  assertEquals(
    parseTag(
      asGenerator(`<a href="test" title="foobar"><span>barfoo</span></a>`)(),
    ),
    {
      type: "a",
      attributes: { href: "test", title: "foobar" },
      children: [{
        type: "span",
        children: ["barfoo"],
      }],
    },
  );
});

// TODO: Siblings, closesWith cases
