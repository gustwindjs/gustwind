import assert from "node:assert/strict";
import test from "node:test";
import { getParseBlock } from "./block.ts";
import { getParseContent } from "./content.ts";
import { parseDefinitionItem } from "./definition_item.ts";
import { parseListItem } from "./list_item.ts";
import { parseTabularItem } from "./tabular_item.ts";
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

test(`tabular list with only header`, () => {
  const name = "tabular";

  assert.deepEqual(
    getParseBlock<Element, string[]>(
      {
        [name]: {
          container: ([header]) => ({
            type: "",
            attributes: {},
            children: [{
              type: "tr",
              attributes: {},
              children: header.map((r) => ({
                type: "th",
                attributes: {},
                children: [r],
              })),
            }],
          }),
          item: parseTabularItem,
        },
      },
    )(
      characterGenerator(String.raw`\begin{${name}}{l|p{4.0cm}|p{5.0cm}}
    Chapter & Purpose & Writing approach \\
\end{${name}}`),
    ),
    {
      type: "",
      attributes: {},
      children: [{
        type: "tr",
        attributes: {},
        children: [
          {
            type: "th",
            attributes: {},
            children: ["Chapter"],
          },
          {
            type: "th",
            attributes: {},
            children: ["Purpose"],
          },
          {
            type: "th",
            attributes: {},
            children: ["Writing approach"],
          },
        ],
      }],
    },
  );
});

test(`tabular list with header and content`, () => {
  const name = "tabular";

  assert.deepEqual(
    getParseBlock<Element, string[]>(
      {
        [name]: {
          container: ([header, ...rows]) => ({
            type: "",
            attributes: {},
            children: [{
              type: "tr",
              attributes: {},
              children: header.map((r) => ({
                type: "th",
                attributes: {},
                children: [r],
              })),
            }].concat(rows.map((row) => ({
              type: "tr",
              attributes: {},
              children: row.map((i) => ({
                type: "td",
                attributes: {},
                children: [i],
              })),
            }))),
          }),
          item: parseTabularItem,
        },
      },
    )(
      characterGenerator(String.raw`\begin{${name}}{l|p{4.0cm}|p{5.0cm}}
    Chapter & Purpose & Writing approach \\
    \hline
    Foo & Bar & Baz \\
\end{${name}}`),
    ),
    {
      type: "",
      attributes: {},
      children: [{
        type: "tr",
        attributes: {},
        children: [
          {
            type: "th",
            attributes: {},
            children: ["Chapter"],
          },
          {
            type: "th",
            attributes: {},
            children: ["Purpose"],
          },
          {
            type: "th",
            attributes: {},
            children: ["Writing approach"],
          },
        ],
      }, {
        type: "tr",
        attributes: {},
        children: [
          {
            type: "td",
            attributes: {},
            children: ["Foo"],
          },
          {
            type: "td",
            attributes: {},
            children: ["Bar"],
          },
          {
            type: "td",
            attributes: {},
            children: ["Baz"],
          },
        ],
      }],
    },
  );
});

// TODO: Assert that begin/end block names are the same - if not, throw
// TODO: Test that the logic throws in case a matching expression was not found
// TODO: Test that the logic throws in case an expression is incomplete
