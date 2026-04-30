import assert from "node:assert/strict";
import test from "node:test";
import { parseDefinitionItem } from "./definition_item.ts";
import { characterGenerator } from "../../characterGenerator.ts";

test(`simple expression`, () => {
  const input = String.raw`\item[foo] bar`;

  assert.deepEqual(
    parseDefinitionItem(characterGenerator(input)),
    { title: "foo", description: "bar" },
  );
});

test(`only single expression`, () => {
  const input = String.raw`\item[foo] bar
\item[bar] foo`;

  assert.deepEqual(
    parseDefinitionItem(characterGenerator(input)),
    { title: "foo", description: "bar" },
  );
});

test(`does not parse an invalid expression`, () => {
  const input = String.raw`\end{description}`;
  const generator = characterGenerator(input);

  assert.throws(
    () => parseDefinitionItem(generator),
    Error,
    `No matching expression was found`,
  );
});
