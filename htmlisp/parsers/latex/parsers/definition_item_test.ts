import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseDefinitionItem } from "./definition_item.ts";
import { characterGenerator } from "../../characterGenerator.ts";

Deno.test(`simple expression`, () => {
  const input = String.raw`\item[foo] bar`;

  assertEquals(
    parseDefinitionItem(characterGenerator(input)),
    { title: "foo", description: "bar" },
  );
});

Deno.test(`only single expression`, () => {
  const input = String.raw`\item[foo] bar
\item[bar] foo`;

  assertEquals(
    parseDefinitionItem(characterGenerator(input)),
    { title: "foo", description: "bar" },
  );
});

Deno.test(`does not parse an invalid expression`, () => {
  const input = String.raw`\end{description}`;
  const generator = characterGenerator(input);

  assertThrows(
    () => parseDefinitionItem(generator),
    Error,
    `No matching expression was found`,
  );

  // It should return the cursor to the spot before the failure
  assertEquals(generator.get(), input[0]);
});
