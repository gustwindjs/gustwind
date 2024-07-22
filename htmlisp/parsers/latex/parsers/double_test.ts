import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseDouble } from "./double.ts";
import { characterGenerator } from "../../characterGenerator.ts";

Deno.test(`id expression`, () => {
  const input = "foobar";

  assertEquals(
    parseDouble({}, characterGenerator(input)),
    [{ type: "p", attributes: {}, children: [input] }],
  );
});
