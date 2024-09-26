import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import {
  blocks,
  cites,
  doubles,
  lists,
  singles,
} from "./defaultExpressions.ts";
import { parseLatex } from "./parseLatex.ts";

Deno.test(`id expression`, () => {
  const input = "foobar";

  assertEquals(
    parseLatex(input, {}),
    [{ type: "p", attributes: {}, children: [input] }],
  );
});

Deno.test(`multiple paragraphs`, () => {
  const input = `foobar

\nbarfoo`;

  assertEquals(
    parseLatex(input, {}),
    [
      { type: "p", attributes: {}, children: ["foobar"] },
      { type: "p", attributes: {}, children: ["\nbarfoo"] },
    ],
  );
});

Deno.test(`bold`, () => {
  const input = String.raw`\textbf{foobar}`;

  assertEquals(
    parseLatex(input, { singles }),
    [{ type: "b", attributes: {}, children: ["foobar"] }],
  );
});

Deno.test(`url`, () => {
  const input = String.raw`\url{https://google.com}`;

  assertEquals(
    parseLatex(input, { singles }),
    [{
      type: "a",
      attributes: { href: "https://google.com" },
      children: ["https://google.com"],
    }],
  );
});

Deno.test(`multiple urls`, () => {
  const input = String.raw`\url{https://google.com}
\url{https://bing.com}`;

  assertEquals(
    parseLatex(input, { singles }),
    [{
      type: "a",
      attributes: { href: "https://google.com" },
      children: ["https://google.com"],
    }, {
      type: "a",
      attributes: { href: "https://bing.com" },
      children: ["https://bing.com"],
    }],
  );
});

Deno.test(`paragraph and url`, () => {
  const input = String.raw`foobar

\url{https://bing.com}`;

  assertEquals(
    parseLatex(input, { singles }),
    [{
      type: "p",
      attributes: {},
      children: ["foobar"],
    }, {
      type: "a",
      attributes: { href: "https://bing.com" },
      children: ["https://bing.com"],
    }],
  );
});

Deno.test(`url and paragraph`, () => {
  const input = String.raw`\url{https://bing.com}

foobar`;

  assertEquals(
    parseLatex(input, { singles }),
    [{
      type: "a",
      attributes: { href: "https://bing.com" },
      children: ["https://bing.com"],
    }, {
      type: "p",
      attributes: {},
      children: ["\nfoobar"],
    }],
  );
});

Deno.test(`url within paragraph`, () => {
  const input = String.raw`foobar \url{https://bing.com} foobar`;

  assertEquals(
    parseLatex(input, { singles }),
    [{
      type: "p",
      attributes: {},
      children: ["foobar ", {
        type: "a",
        attributes: { href: "https://bing.com" },
        children: ["https://bing.com"],
      }, " foobar"],
    }],
  );
});

// TODO: Test other singles - these tests could be even generated from the definition

Deno.test(`href`, () => {
  const input = String.raw`\href{https://google.com}{Google}`;

  assertEquals(
    parseLatex(input, { doubles }),
    [{
      type: "a",
      attributes: { href: "https://google.com" },
      children: ["Google"],
    }],
  );
});

Deno.test(`single line verbatim`, () => {
  const input = String.raw`\begin{verbatim}test\end{verbatim}`;

  assertEquals(
    parseLatex(input, { blocks }),
    [{
      type: "pre",
      attributes: {},
      children: ["test"],
    }],
  );
});

Deno.test(`multiline verbatim`, () => {
  const input = String.raw`\begin{verbatim}
test
\end{verbatim}`;

  assertEquals(
    parseLatex(input, { blocks }),
    [{
      type: "pre",
      attributes: {},
      children: ["\ntest\n"],
    }],
  );
});

Deno.test(`enumerate`, () => {
  const input = String.raw`\begin{enumerate}
\item test
\end{enumerate}`;

  assertEquals(
    parseLatex(input, { lists }),
    [{
      type: "ol",
      attributes: {},
      children: [{ type: "li", attributes: {}, children: ["test"] }],
    }],
  );
});

Deno.test(`itemize`, () => {
  const input = String.raw`\begin{itemize}
\item test
\end{itemize}`;

  assertEquals(
    parseLatex(input, { lists }),
    [{
      type: "ul",
      attributes: {},
      children: [{ type: "li", attributes: {}, children: ["test"] }],
    }],
  );
});

Deno.test(`description`, () => {
  const input = String.raw`\begin{description}
\item[foo] bar
\end{description}`;

  assertEquals(
    parseLatex(input, { lists }),
    [{
      type: "dl",
      attributes: {},
      children: [
        {
          type: "",
          attributes: {},
          children: [
            { type: "dt", attributes: {}, children: ["foo"] },
            { type: "dd", attributes: {}, children: ["bar"] },
          ],
        },
      ],
    }],
  );
});

Deno.test(`cite`, () => {
  const input = String.raw`Foobar \cite{test24}`;

  assertEquals(
    parseLatex(input, { singles: cites({}) }),
    [
      {
        type: "p",
        attributes: {},
        children: ["Foobar ", {
          type: "span",
          attributes: { title: "test24" },
          children: ["[1]"],
        }],
      },
    ],
  );
});

Deno.test(`cite with a tilde`, () => {
  const input = String.raw`Foobar~\cite{test24}`;

  assertEquals(
    parseLatex(input, { singles: cites({}) }),
    [
      {
        type: "p",
        attributes: {},
        children: ["Foobar ", {
          type: "span",
          attributes: { title: "test24" },
          children: ["[1]"],
        }],
      },
    ],
  );
});

Deno.test(`cite twice to the same reference`, () => {
  const input = String.raw`Foobar \cite{test24} \cite{test24}`;

  assertEquals(
    parseLatex(input, { singles: cites({}) }),
    [
      {
        type: "p",
        attributes: {},
        children: [
          "Foobar ",
          {
            type: "span",
            attributes: { title: "test24" },
            children: ["[1]"],
          },
          " ",
          {
            type: "span",
            attributes: { title: "test24" },
            children: ["[1]"],
          },
        ],
      },
    ],
  );
});

Deno.test(`cite to different references`, () => {
  const input = String.raw`Foobar \cite{test24} \cite{test12}`;

  assertEquals(
    parseLatex(input, { singles: cites({}) }),
    [
      {
        type: "p",
        attributes: {},
        children: [
          "Foobar ",
          {
            type: "span",
            attributes: { title: "test24" },
            children: ["[1]"],
          },
          " ",
          {
            type: "span",
            attributes: { title: "test12" },
            children: ["[2]"],
          },
        ],
      },
    ],
  );
});

// TODO: Implement
Deno.test(`cite to two different references`, () => {
  const input = String.raw`Foobar \cite{test12, test24}`;

  // TODO: Specify test result
  assertEquals(
    parseLatex(input, { singles: cites({}) }),
    [
      {
        type: "p",
        attributes: {},
        children: [
          "Foobar ",
          {
            type: "span",
            attributes: { title: "test24" },
            children: ["[1], [2]"],
          },
        ],
      },
    ],
  );
});

// TODO: Implement
Deno.test(`cite to three different references`, () => {
  const input = String.raw`Foobar \cite{test12, test24, test36}`;

  // TODO: Specify test result
  assertEquals(
    parseLatex(input, { singles: cites({}) }),
    [
      {
        type: "p",
        attributes: {},
        children: [
          "Foobar ",
          {
            type: "span",
            attributes: { title: "test24" },
            children: ["[1], [2], [3]"],
          },
        ],
      },
    ],
  );
});

// TODO: Test \ref, \nameref, \autoref - these need some lookup against labels
// TODO: Pass parsed bibtex data to cite parsers
