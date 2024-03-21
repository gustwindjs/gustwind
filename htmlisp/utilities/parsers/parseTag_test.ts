import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseTag } from "./parseTag.ts";
import { asGenerator } from "./utils.ts";

Deno.test("parse tag", () => {
  assertEquals(
    parseTag(asGenerator(`<a href="test" title="foobar">`)()),
    { type: "a", attributes: { href: "test", title: "foobar" } },
  );
});
