import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseDefinitionItem } from "./definition_item.ts";
import { characterGenerator } from "../../characterGenerator.ts";

Deno.test(`simple expression`, () => {
  const input = String.raw`\item[foo] bar`;

  assertEquals(
    parseDefinitionItem(
      characterGenerator(input),
    ),
    { title: "foo", description: "bar" },
  );
});
