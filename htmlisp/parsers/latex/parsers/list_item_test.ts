import assert from "node:assert/strict";
import test from "node:test";
import { parseListItem } from "./list_item.ts";
import { characterGenerator } from "../../characterGenerator.ts";

test(`simple expression`, () => {
  const input = String.raw`\item foobar`;

  assert.deepEqual(
    parseListItem(characterGenerator(input)),
    "foobar",
  );
});

test(`only single expression`, () => {
  const input = String.raw`\item foobar
\item barfoo`;

  assert.deepEqual(
    parseListItem(characterGenerator(input)),
    "foobar",
  );
});

test(`does not parse an invalid expression`, () => {
  const input = String.raw`\end{itemize}`;
  const generator = characterGenerator(input);

  assert.throws(
    () => parseListItem(generator),
    Error,
    `No matching expression was found`,
  );
});
