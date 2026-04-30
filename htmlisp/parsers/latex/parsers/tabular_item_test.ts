import assert from "node:assert/strict";
import test from "node:test";
import { parseTabularItem } from "./tabular_item.ts";
import { characterGenerator } from "../../characterGenerator.ts";

test(`simple expression`, () => {
  const input = String.raw`Chapter & Purpose & Writing approach \\`;

  assert.deepEqual(
    parseTabularItem(characterGenerator(input)),
    ["Chapter", "Purpose", "Writing approach"],
  );
});

test(`only single expression`, () => {
  const input = String.raw`Chapter & Purpose & Writing approach \\
Foo & Bar & Baz \\`;
  const getCharacter = characterGenerator(input);

  assert.deepEqual(
    parseTabularItem(getCharacter),
    ["Chapter", "Purpose", "Writing approach"],
  );
  assert.deepEqual(getCharacter.get(), "\n");
});

test(`only single expression with a tabular end`, () => {
  const input = String.raw`Foo & Bar & Baz \\
\end{tabular}`;
  const getCharacter = characterGenerator(input);

  assert.deepEqual(
    parseTabularItem(getCharacter),
    ["Foo", "Bar", "Baz"],
  );
  assert.deepEqual(getCharacter.get(), "\n");
});

test(`hline`, () => {
  const input = String.raw`\hline`;

  assert.deepEqual(
    parseTabularItem(characterGenerator(input)),
    [],
  );
});

test(`hline with content`, () => {
  const input = String.raw`\hline
Foo & Bar & Baz \\`;

  assert.deepEqual(
    parseTabularItem(characterGenerator(input)),
    [],
  );
});

test(`hline with content and whitespace`, () => {
  const input = String.raw`  \hline
  Foo & Bar & Baz \\`;

  assert.deepEqual(
    parseTabularItem(characterGenerator(input)),
    [],
  );
});

test(`does not parse an invalid expression`, () => {
  const input = String.raw`\end{description}`;
  const generator = characterGenerator(input);

  assert.throws(
    () => parseTabularItem(generator),
    Error,
    `No matching expression was found`,
  );
});
