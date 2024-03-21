import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseAttribute } from "./parseAttribute.ts";
import { asGenerator } from "./utils.ts";

Deno.test("parse attribute", () => {
  assertEquals(
    parseAttribute(asGenerator(`href="test"`)()),
    { href: "test" },
  );
});
