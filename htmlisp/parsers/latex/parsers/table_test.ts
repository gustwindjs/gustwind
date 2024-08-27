import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { getParseTable } from "./table.ts";
import { characterGenerator } from "../../characterGenerator.ts";
import type { Element } from "../../../types.ts";

Deno.test(`empty table`, () => {
  assertEquals(
    getParseTable<Element>(
      {
        container: () => ({
          type: "table",
          attributes: {},
          children: [],
        }),
      },
    )(
      characterGenerator(String.raw`\begin{table}\end{table}`),
    ),
    {
      type: "table",
      attributes: {},
      children: [],
    },
  );
});

// TODO: Test label + caption parsing separately and together

// TODO: Handle recursion here at definition level since it should find a block inside a block + handle metadata
Deno.test(`complete table`, () => {
  assertEquals(
    getParseTable<Element>(
      // TODO: Expand this definition
      {
        container: () => ({
          type: "table",
          attributes: {},
          children: [],
        }),
      },
    )(
      characterGenerator(String.raw`\begin{table}
  \begin{tabular}{l|p{4.0cm}|p{5.0cm}}
    Chapter & Purpose & Writing approach \\
    \hline
    Foo & Bar & Baz \\
  \end{tabular}
  \caption{Chapter types}
  \label{table:imrad}
\end{table}`),
    ),
    {
      type: "table",
      attributes: {
        id: "table:imrad",
      },
      children: [{
        type: "caption",
        attributes: {},
        children: ["Chapter types"],
      }, {
        type: "tr",
        attributes: {},
        children: [
          { type: "th", attributes: {}, children: ["Chapter"] },
          { type: "th", attributes: {}, children: ["Purpose"] },
          { type: "th", attributes: {}, children: ["Writing approach"] },
        ],
      }, {
        type: "tr",
        attributes: {},
        children: [
          { type: "td", attributes: {}, children: ["Foo"] },
          { type: "td", attributes: {}, children: ["Bar"] },
          { type: "td", attributes: {}, children: ["Baz"] },
        ],
      }],
    },
  );
});

// TODO: Assert that begin/end block names are the same - if not, throw
// TODO: Test that the logic throws in case a matching expression was not found
// TODO: Test that the logic throws in case an expression is incomplete
