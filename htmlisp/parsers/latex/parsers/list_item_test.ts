import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseListItem } from "./list_item.ts";
import { characterGenerator } from "../../characterGenerator.ts";

Deno.test(`simple expression`, () => {
  const input = String.raw`\item foobar`;

  assertEquals(
    parseListItem({ getCharacter: characterGenerator(input) }),
    "foobar",
  );
});

Deno.test(`only single expression`, () => {
  const input = String.raw`\item foobar
\item barfoo`;

  assertEquals(
    parseListItem({ getCharacter: characterGenerator(input) }),
    "foobar",
  );
});

Deno.test(`does not parse an invalid expression`, () => {
  const input = String.raw`\end{itemize}`;
  const generator = characterGenerator(input);

  assertThrows(
    () => parseListItem({ getCharacter: generator }),
    Error,
    `No matching expression was found`,
  );
});

// TODO: Allow list items to contain latex syntax (recursive parsing)
