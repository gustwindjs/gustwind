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

Deno.test(`tabular list`, () => {
  const name = "tabular";

  assertEquals(
    getParseBlock<Element, string[]>(
      {
        [name]: {
          container: (items) => ({
            type: "div",
            attributes: {},
            // TODO: Figure out what to do here
            children: [items.join("")],
          }),
          item: parseTabularItem,
        },
      },
    )(
      // TODO: Allow parsing {}'s within doubles (needs a change at double parser)
      characterGenerator(String.raw`\begin{${name}}{l|p{4.0cm}|p{5.0cm}}
    Chapter & Purpose & Writing approach \\
    \hline
    Foo & Bar & Baz \\
\end{${name}}`),
    ),
    { type: "div", attributes: {}, children: ["Foo", "Bar"] },
  );
});

// TODO: Assert that begin/end block names are the same - if not, throw
// TODO: Test that the logic throws in case a matching expression was not found
// TODO: Test that the logic throws in case an expression is incomplete
