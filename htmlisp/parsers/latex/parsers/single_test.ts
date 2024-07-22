import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseSingle } from "./single.ts";
import { characterGenerator } from "../../characterGenerator.ts";

Deno.test(`id expression`, () => {
  const input = "foobar";

  assertEquals(
    parseSingle({}, characterGenerator(input)),
    [{ type: "p", attributes: {}, children: [input] }],
  );
});
