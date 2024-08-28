import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { getParseBlock } from "./block.ts";
import { getParseContent } from "./content.ts";
import { parseDefinitionItem } from "./definition_item.ts";
import { parseListItem } from "./list_item.ts";
import { parseTabularItem } from "./tabular_item.ts";
import { characterGenerator } from "../../characterGenerator.ts";
import type { Element } from "../../../types.ts";

Deno.test(`simple expression`, () => {
  const name = "verbatim";
  const input = "foobar";

  assertEquals(
    getParseBlock<Element, string>(
      {
        [name]: {
          container: (children) => ({
            type: "div",
            attributes: {},
            children,
          }),
          item: getParseContent((s) => s.join("")),
        },
      },
    )(
      characterGenerator(String.raw`\begin{${name}}${input}\end{${name}}`),
    ),
    { type: "div", attributes: {}, children: [input] },
  );
});

Deno.test(`simple list`, () => {
  const name = "itemize";

  assertEquals(
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

Deno.test(`simple definition list`, () => {
  const name = "itemize";

  assertEquals(
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

Deno.test(`tabular list with only header`, () => {
  const name = "tabular";

  assertEquals(
    getParseBlock<Element, string[]>(
      {
        [name]: {
          container: (items) => {
            const [header, ..._rows] = items;

            return ({
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
            });
          },
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

Deno.test(`tabular list with header and content`, () => {
  const name = "tabular";

  assertEquals(
    getParseBlock<Element, string[]>(
      {
        [name]: {
          container: (items) => {
            const [header, ...rows] = items;

            // TODO: Map rows to tr/td
            return ({
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
            });
          },
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
      }],
    },
  );
});

// TODO: Assert that begin/end block names are the same - if not, throw
// TODO: Test that the logic throws in case a matching expression was not found
// TODO: Test that the logic throws in case an expression is incomplete
