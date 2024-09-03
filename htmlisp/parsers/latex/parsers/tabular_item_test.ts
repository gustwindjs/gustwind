import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseTabularItem } from "./tabular_item.ts";
import { characterGenerator } from "../../characterGenerator.ts";

Deno.test(`simple expression`, () => {
  const input = String.raw`Chapter & Purpose & Writing approach \\`;

  assertEquals(
    parseTabularItem(characterGenerator(input)).value,
    ["Chapter", "Purpose", "Writing approach"],
  );
});

Deno.test(`only single expression`, () => {
  const input = String.raw`Chapter & Purpose & Writing approach \\
Foo & Bar & Baz \\`;
  const getCharacter = characterGenerator(input);

  assertEquals(
    parseTabularItem(getCharacter).value,
    ["Chapter", "Purpose", "Writing approach"],
  );
  assertEquals(getCharacter.get(), "\n");
});

Deno.test(`only single expression with a tabular end`, () => {
  const input = String.raw`Foo & Bar & Baz \\
\end{tabular}`;
  const getCharacter = characterGenerator(input);

  assertEquals(
    parseTabularItem(getCharacter).value,
    ["Foo", "Bar", "Baz"],
  );
  assertEquals(getCharacter.get(), "\n");
});

Deno.test(`hline`, () => {
  const input = String.raw`\hline`;

  assertEquals(
    parseTabularItem(characterGenerator(input)).value,
    [],
  );
});

Deno.test(`hline with content`, () => {
  const input = String.raw`\hline
Foo & Bar & Baz \\`;

  assertEquals(
    parseTabularItem(characterGenerator(input)).value,
    [],
  );
});

Deno.test(`hline with content and whitespace`, () => {
  const input = String.raw`  \hline
  Foo & Bar & Baz \\`;

  assertEquals(
    parseTabularItem(characterGenerator(input)).value,
    [],
  );
});

Deno.test(`does not parse an invalid expression`, () => {
  const input = String.raw`\end{description}`;
  const generator = characterGenerator(input);

  assertThrows(
    () => parseTabularItem(generator),
    Error,
    `No matching expression was found`,
  );
});
