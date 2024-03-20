import * as states from "./states.ts";
import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseTagEnd, parseTagStart } from "./parseTag.ts";

// TODO
Deno.test("parse tag start", () => {
  assertEquals(
    parseTagStart("", "<").next().value,
    { value: "woof", state: states.IDLE },
  );
});

// TODO
Deno.test("parse tag end", () => {
  assertEquals(
    parseTagEnd("", ">").next().value,
    { value: "woof", state: states.IDLE },
  );
});
