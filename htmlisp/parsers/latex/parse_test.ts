import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parse } from "./parse.ts";
import { characterGenerator } from "../characterGenerator.ts";

Deno.test(`id expression`, () => {
  const input = "foobar";

  assertEquals(
    // TODO: This is likely too specific
    parse({ singles: [], doubles: [], blocks: [] }, characterGenerator(input)),
    [{ type: "p", attributes: {}, children: [input] }],
  );
});
