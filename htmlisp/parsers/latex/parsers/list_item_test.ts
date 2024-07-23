import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseListItem } from "./list_item.ts";
import { characterGenerator } from "../../characterGenerator.ts";

Deno.test(`simple expression`, () => {
  const input = "\item foobar";

  assertEquals(
    parseListItem(
      characterGenerator(String.raw`${input}\\`),
    ),
    "foobar",
  );
});
