import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseDefinitionItem } from "./definition_item.ts";
import { characterGenerator } from "../../characterGenerator.ts";

Deno.test(`simple expression`, () => {
  const input = String.raw`\item[foo] bar`;

  assertEquals(
    parseDefinitionItem(
      { getCharacter: characterGenerator(input) },
    ),
    { title: "foo", description: "bar" },
  );
});

Deno.test(`only single expression`, () => {
  const input = String.raw`\item[foo] bar
\item[bar] foo`;

  assertEquals(
    parseDefinitionItem(
      { getCharacter: characterGenerator(input) },
    ),
    { title: "foo", description: "bar" },
  );
});

Deno.test(`does not parse an invalid expression`, () => {
  const input = String.raw`\end{description}`;
  const generator = characterGenerator(input);

  assertThrows(
    () => parseDefinitionItem({ getCharacter: generator }),
    Error,
    `No matching expression was found`,
  );
});
