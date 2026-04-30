import assert from "node:assert/strict";
import test from "node:test";
import { parseTable } from "./table.ts";
import { characterGenerator } from "../../characterGenerator.ts";

// TODO: Fix this - there's some cursor issue (misses \)
test(`empty table`, () => {
  assert.deepEqual(
    parseTable(
      characterGenerator(String.raw`\begin{table}\end{table}`),
    ),
    {},
  );
});

test(`table with label`, () => {
  assert.deepEqual(
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

test(`table with caption`, () => {
  assert.deepEqual(
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

test(`table with caption and label`, () => {
  assert.deepEqual(
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

test(`table with label and caption`, () => {
  assert.deepEqual(
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

// TODO: Fix this - misses tabular (nested parsing issue)
test(`complete table`, () => {
  assert.deepEqual(
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
