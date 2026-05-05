import assert from "node:assert/strict";
import test from "node:test";
import {
  blocks,
  cites,
  doubles,
  el,
  lists,
  singles,
} from "./defaultExpressions.ts";
import { parseLatex } from "./parseLatex.ts";

test(`id expression`, () => {
  const input = "foobar";

  assert.deepEqual(
    parseLatex(input, {}),
    [{ type: "p", attributes: {}, children: [input] }],
  );
});

test(`discretionary hyphen`, () => {
  const input = String.raw`dis\-cretionary`;

  assert.deepEqual(
    parseLatex(input, {}),
    [{ type: "p", attributes: {}, children: ["discretionary"] }],
  );
});

test(`multiple paragraphs`, () => {
  const input = `foobar

\nbarfoo`;

  assert.deepEqual(
    parseLatex(input, {}),
    [
      { type: "p", attributes: {}, children: ["foobar"] },
      { type: "p", attributes: {}, children: ["barfoo"] },
    ],
  );
});

test(`bold`, () => {
  const input = String.raw`\textbf{foobar}`;

  assert.deepEqual(
    parseLatex(input, { singles }),
    [{ type: "b", attributes: {}, children: ["foobar"] }],
  );
});

test(`url`, () => {
  const input = String.raw`\url{https://google.com}`;

  assert.deepEqual(
    parseLatex(input, { singles }),
    [{
      type: "a",
      attributes: { href: "https://google.com" },
      children: ["https://google.com"],
    }],
  );
});

test(`multiple urls`, () => {
  const input = String.raw`\url{https://google.com}
\url{https://bing.com}`;

  assert.deepEqual(
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

test(`multiple urls 2`, () => {
  const input = String.raw`\url{https://google.com}

\url{https://bing.com}`;

  assert.deepEqual(
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

test(`paragraph and url`, () => {
  const input = String.raw`foobar

\url{https://bing.com}`;

  assert.deepEqual(
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

test(`url and paragraph`, () => {
  const input = String.raw`\url{https://bing.com}

foobar`;

  assert.deepEqual(
    parseLatex(input, { singles }),
    [{
      type: "a",
      attributes: { href: "https://bing.com" },
      children: ["https://bing.com"],
    }, {
      type: "p",
      attributes: {},
      children: ["foobar"],
    }],
  );
});

test(`two urls and paragraph`, () => {
  const input = String.raw`\url{https://bing.com}
\url{https://bing.com}

foobar`;

  assert.deepEqual(
    parseLatex(input, { singles }),
    [{
      type: "a",
      attributes: { href: "https://bing.com" },
      children: ["https://bing.com"],
    }, {
      type: "a",
      attributes: { href: "https://bing.com" },
      children: ["https://bing.com"],
    }, {
      type: "p",
      attributes: {},
      children: ["foobar"],
    }],
  );
});

test(`url within paragraph`, () => {
  const input = String.raw`foobar \url{https://bing.com} foobar`;

  assert.deepEqual(
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

test(`url before paragraph without a blank line`, () => {
  const input = String.raw`\url{https://bing.com}
foobar`;

  assert.deepEqual(
    parseLatex(input, { singles }),
    [{
      type: "p",
      attributes: {},
      children: [{
        type: "a",
        attributes: { href: "https://bing.com" },
        children: ["https://bing.com"],
      }, "foobar"],
    }],
  );
});

test(`escaped percent in content`, () => {
  const input = String.raw`100\% ready`;

  assert.deepEqual(
    parseLatex(input, {}),
    [{ type: "p", attributes: {}, children: ["100% ready"] }],
  );
});

test(`escaped latex delimiters in a single expression`, () => {
  const input = String.raw`\textbf{\{value\}}`;

  assert.deepEqual(
    parseLatex(input, { singles }),
    [{ type: "b", attributes: {}, children: ["{value}"] }],
  );
});

test(`unknown nested latex command is retained`, () => {
  const input = String.raw`\textbf{before \unknown{value} after}`;

  assert.deepEqual(
    parseLatex(input, { singles }),
    [{
      type: "b",
      attributes: {},
      children: ["before ", String.raw`\unknown{value} after`],
    }],
  );
});

test(`no-argument single expression`, () => {
  const input = String.raw`\textbackslash`;

  assert.deepEqual(
    parseLatex(input, { singles }),
    ["\\"],
  );
});

test(`multiple single blocks with a newline between`, () => {
  const input = String.raw`\chapter{Introduction}
\label{ch:introduction}
\input{chapters/01-introduction}

\chapter{What is scientific writing}
\label{ch:what-is-scientific-writing}
\input{chapters/02-what-is-scientific-writing}
`;

  assert.deepEqual(
    parseLatex(input, {
      singles: {
        chapter: el("title"),
        label: el("label"),
        input: el("slug"),
      },
    }),
    [{
      type: "title",
      attributes: {},
      children: ["Introduction"],
    }, {
      type: "label",
      attributes: {},
      children: ["ch:introduction"],
    }, {
      type: "slug",
      attributes: {},
      children: ["chapters/01-introduction"],
    }, {
      type: "title",
      attributes: {},
      children: ["What is scientific writing"],
    }, {
      type: "label",
      attributes: {},
      children: ["ch:what-is-scientific-writing"],
    }, {
      type: "slug",
      attributes: {},
      children: ["chapters/02-what-is-scientific-writing"],
    }],
  );
});

// TODO: Test other singles - these tests could be even generated from the definition

test(`href`, () => {
  const input = String.raw`\href{https://google.com}{Google}`;

  assert.deepEqual(
    parseLatex(input, { doubles }),
    [{
      type: "a",
      attributes: { href: "https://google.com" },
      children: ["Google"],
    }],
  );
});

test(`double expression nested in single expression`, () => {
  const input = String
    .raw`Research\footnote{Occasionally this is called \href{https://example.com}{sensemaking}.}`;

  assert.deepEqual(
    parseLatex(input, {
      singles: { ...singles, ...cites({}) },
      doubles,
    }),
    [{
      type: "p",
      attributes: {},
      children: ["Research", {
        type: "sup",
        attributes: {
          title: "Occasionally this is called sensemaking.",
        },
        children: ["1"],
      }],
    }],
  );
});

test(`newline expression`, () => {
  const input = String.raw`Literature\newline Review`;

  assert.deepEqual(
    parseLatex(input, { singles, doubles }),
    [{
      type: "p",
      attributes: {},
      children: ["Literature", " ", "Review"],
    }],
  );
});

test(`single line verbatim`, () => {
  const input = String.raw`\begin{verbatim}test\end{verbatim}`;

  assert.deepEqual(
    parseLatex(input, { blocks }),
    [{
      type: "pre",
      attributes: {},
      children: ["test"],
    }],
  );
});

test(`multiline verbatim`, () => {
  const input = String.raw`\begin{verbatim}
test
\end{verbatim}`;

  assert.deepEqual(
    parseLatex(input, { blocks }),
    [{
      type: "pre",
      attributes: {},
      children: ["\ntest\n"],
    }],
  );
});

test(`enumerate`, () => {
  const input = String.raw`\begin{enumerate}
\item test
\end{enumerate}`;

  assert.deepEqual(
    parseLatex(input, { lists }),
    [{
      type: "ol",
      attributes: {},
      children: [{ type: "li", attributes: {}, children: ["test"] }],
    }],
  );
});

test(`itemize`, () => {
  const input = String.raw`\begin{itemize}
\item test
\end{itemize}`;

  assert.deepEqual(
    parseLatex(input, { lists }),
    [{
      type: "ul",
      attributes: {},
      children: [{ type: "li", attributes: {}, children: ["test"] }],
    }],
  );
});

test(`description`, () => {
  const input = String.raw`\begin{description}
\item[foo] bar
\end{description}`;

  assert.deepEqual(
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
