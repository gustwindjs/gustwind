import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseAttribute, parseAttributes } from "./parseAttribute.ts";

Deno.test("parse attributes", () => {
  assertEquals(
    parseAttributes(asGenerator(`href="test" title="foobar"`)()),
    { href: "test", title: "foobar" },
  );
});

Deno.test("parse attribute", () => {
  assertEquals(
    parseAttribute(asGenerator(`href="test"`)()),
    { href: "test" },
  );
});

function asGenerator(s: string) {
  return function* getCharacter() {
    for (let i = 0; i < s.length; i++) {
      yield s[i];
    }
  };
}
