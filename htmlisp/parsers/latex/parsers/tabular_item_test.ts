import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseTabularItem } from "./tabular_item.ts";
import { characterGenerator } from "../../characterGenerator.ts";

Deno.test(`simple expression`, () => {
  const input = String.raw`Chapter & Purpose & Writing approach \\`;

  assertEquals(
    parseTabularItem(characterGenerator(input)),
    ["Chapter", "Purpose", "Writing approach"],
  );
});

Deno.test(`only single expression`, () => {
  const input = String.raw`Chapter & Purpose & Writing approach \\
Foo & Bar & Baz \\`;

  assertEquals(
    parseTabularItem(characterGenerator(input)),
    ["Chapter", "Purpose", "Writing approach"],
  );
});
