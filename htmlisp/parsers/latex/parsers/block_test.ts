import assert from "node:assert/strict";
import test from "node:test";
import { getParseBlock } from "./block.ts";
import { getParseContent } from "./content.ts";
import { parseDefinitionItem } from "./definition_item.ts";
import { parseListItem } from "./list_item.ts";
import { characterGenerator } from "../../characterGenerator.ts";
import type { Element } from "../../../types.ts";

test(`simple expression`, () => {
  const name = "verbatim";
  const input = "foobar";

  assert.deepEqual(
    getParseBlock<Element, string>(
      {
        [name]: {
          container: (children) => ({
            type: "div",
            attributes: {},
            children,
          }),
          item: getParseContent<string>((s) => s.join("")),
        },
      },
    )(
      characterGenerator(String.raw`\begin{${name}}${input}\end{${name}}`),
    ),
    { type: "div", attributes: {}, children: [input] },
  );
});

test(`simple expression with a newline`, () => {
  const name = "verbatim";
  const input = "foobar";

  assert.deepEqual(
    getParseBlock<Element, string>(
      {
        [name]: {
          container: (children) => ({
            type: "div",
            attributes: {},
            children,
          }),
          item: getParseContent<string>((s) => s.join("")),
        },
      },
    )(
      characterGenerator(String.raw`\begin{${name}}
${input}
\end{${name}}`),
    ),
    { type: "div", attributes: {}, children: ["\n" + input + "\n"] },
  );
});

test(`begin and end next to each other`, () => {
  const name = "verbatim";

  assert.deepEqual(
    getParseBlock<Element, string>(
      {
        [name]: {
          container: (children) => ({
            type: "div",
            attributes: {},
            children,
          }),
          item: getParseContent<string>((s) => s.join("")),
        },
      },
    )(
      characterGenerator(String.raw`\begin{${name}}\end{${name}}`),
    ),
    { type: "div", attributes: {}, children: [] },
  );
});

test(`simple list`, () => {
  const name = "itemize";

  assert.deepEqual(
    getParseBlock<Element, string>(
      {
        [name]: {
          container: (children) => ({
            type: "div",
            attributes: {},
            children,
          }),
          item: parseListItem,
        },
      },
    )(
      characterGenerator(String.raw`\begin{${name}}
        \item Foo
        \item Bar
\end{${name}}`),
    ),
    { type: "div", attributes: {}, children: ["Foo", "Bar"] },
  );
});

test(`simple definition list`, () => {
  const name = "itemize";

  assert.deepEqual(
    getParseBlock<Element, ReturnType<typeof parseDefinitionItem>>(
      {
        [name]: {
          container: (children) => ({
            type: "div",
            attributes: {},
            children: children
              .map(({ title, description }) => `${title}: ${description}`),
          }),
          item: parseDefinitionItem,
        },
      },
    )(
      characterGenerator(String.raw`\begin{${name}}
        \item[Foo] foo
        \item[Bar] bar
\end{${name}}`),
    ),
    { type: "div", attributes: {}, children: ["Foo: foo", "Bar: bar"] },
  );
});

// TODO: Assert that begin/end block names are the same - if not, throw
// TODO: Test that the logic throws in case a matching expression was not found
// TODO: Test that the logic throws in case an expression is incomplete
