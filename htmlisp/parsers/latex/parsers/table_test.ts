import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseTable } from "./table.ts";
import { characterGenerator } from "../../characterGenerator.ts";

Deno.test(`empty table`, () => {
  assertEquals(
    parseTable(
      characterGenerator(String.raw`\begin{table}\end{table}`),
    ),
    {},
  );
});

Deno.test(`table with label`, () => {
  assertEquals(
    parseTable(
      characterGenerator(String.raw`\begin{table}
  \label{table:imrad}
\end{table}`),
    ),
    {
      label: "table:imrad",
    },
  );
});

Deno.test(`table with caption`, () => {
  assertEquals(
    parseTable(
      characterGenerator(String.raw`\begin{table}
  \caption{Test}
\end{table}`),
    ),
    {
      caption: "Test",
    },
  );
});

Deno.test(`table with caption and label`, () => {
  assertEquals(
    parseTable(
      characterGenerator(String.raw`\begin{table}
  \label{table:imrad}
  \caption{Test}
\end{table}`),
    ),
    {
      caption: "Test",
      label: "table:imrad",
    },
  );
});

Deno.test(`table with label and caption`, () => {
  assertEquals(
    parseTable(
      characterGenerator(String.raw`\begin{table}
  \caption{Test}
  \label{table:imrad}
\end{table}`),
    ),
    {
      caption: "Test",
      label: "table:imrad",
    },
  );
});

Deno.test(`complete table`, () => {
  assertEquals(
    parseTable(
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
      caption: "Chapter types",
      label: "table:imrad",
      header: ["Chapter", "Purpose", "Writing approach"],
      rows: [["Foo", "Bar", "Baz"]],
    },
  );
});

// TODO: Assert that begin/end block names are the same - if not, throw
// TODO: Test that the logic throws in case a matching expression was not found
// TODO: Test that the logic throws in case an expression is incomplete
