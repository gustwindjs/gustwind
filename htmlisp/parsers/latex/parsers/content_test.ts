import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseContent } from "./content.ts";
import { characterGenerator } from "../../characterGenerator.ts";

Deno.test(`simple expression`, () => {
  const input = "foobar";

  assertEquals(
    parseContent(
      characterGenerator(String.raw`${input}\\`),
    ),
    input,
  );
});
