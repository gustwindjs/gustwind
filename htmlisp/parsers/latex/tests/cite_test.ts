import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { cites } from "../defaultExpressions.ts";
import { parseLatex } from "../parseLatex.ts";

Deno.test(`cite`, () => {
  const input = String.raw`Foobar \cite{test24}`;

  assertEquals(
    parseLatex(input, {
      singles: cites({
        test24: {
          type: "ARTICLE",
          id: "test24",
          fields: {
            author: "John Doe",
            title: "Test title",
          },
        },
      }),
    }),
    [
      {
        type: "p",
        attributes: {},
        children: ["Foobar ", {
          type: "span",
          attributes: { title: "Test title - John Doe" },
          children: ["[1]"],
        }],
      },
    ],
  );
});

Deno.test(`cite with a tilde`, () => {
  const input = String.raw`Foobar~\cite{test24}`;

  assertEquals(
    parseLatex(input, {
      singles: cites({
        test24: {
          type: "ARTICLE",
          id: "test24",
          fields: {
            author: "John Doe",
            title: "Test title",
          },
        },
      }),
    }),
    [
      {
        type: "p",
        attributes: {},
        children: ["Foobar ", {
          type: "span",
          attributes: { title: "Test title - John Doe" },
          children: ["[1]"],
        }],
      },
    ],
  );
});

Deno.test(`cite twice to the same reference`, () => {
  const input = String.raw`Foobar \cite{test24} \cite{test24}`;

  assertEquals(
    parseLatex(input, {
      singles: cites({
        test24: {
          type: "ARTICLE",
          id: "test24",
          fields: {
            author: "John Doe",
            title: "Test title",
          },
        },
      }),
    }),
    [
      {
        type: "p",
        attributes: {},
        children: [
          "Foobar ",
          {
            type: "span",
            attributes: { title: "Test title - John Doe" },
            children: ["[1]"],
          },
          " ",
          {
            type: "span",
            attributes: { title: "Test title - John Doe" },
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
    parseLatex(input, {
      singles: cites({
        test12: {
          type: "ARTICLE",
          id: "test12",
          fields: {
            author: "Jane Doe",
            title: "Test title 2",
          },
        },
        test24: {
          type: "ARTICLE",
          id: "test24",
          fields: {
            author: "John Doe",
            title: "Test title",
          },
        },
      }),
    }),
    [
      {
        type: "p",
        attributes: {},
        children: [
          "Foobar ",
          {
            type: "span",
            attributes: { title: "Test title - John Doe" },
            children: ["[1]"],
          },
          " ",
          {
            type: "span",
            attributes: { title: "Test title 2 - Jane Doe" },
            children: ["[2]"],
          },
        ],
      },
    ],
  );
});

Deno.test(`cite to two different references`, () => {
  const input = String.raw`Foobar \cite{test12, test24}`;

  assertEquals(
    parseLatex(input, {
      singles: cites({
        test12: {
          type: "ARTICLE",
          id: "test12",
          fields: {
            author: "Jane Doe",
            title: "Test title 2",
          },
        },
        test24: {
          type: "ARTICLE",
          id: "test24",
          fields: {
            author: "John Doe",
            title: "Test title",
          },
        },
      }),
    }),
    [
      {
        type: "p",
        attributes: {},
        children: [
          "Foobar ",
          {
            type: "span",
            attributes: {
              title: "Test title 2 - Jane Doe, Test title - John Doe",
            },
            children: ["[1, 2]"],
          },
        ],
      },
    ],
  );
});

Deno.test(`cite to three different references`, () => {
  const input = String.raw`Foobar \cite{test12, test24, test36}`;

  assertEquals(
    parseLatex(input, {
      singles: cites({
        test12: {
          type: "ARTICLE",
          id: "test12",
          fields: {
            author: "Jane Doe",
            title: "Test title 2",
          },
        },
        test24: {
          type: "ARTICLE",
          id: "test24",
          fields: {
            author: "John Doe",
            title: "Test title",
          },
        },
        test36: {
          type: "ARTICLE",
          id: "test36",
          fields: {
            author: "John John",
            title: "Test title 3",
          },
        },
      }),
    }),
    [
      {
        type: "p",
        attributes: {},
        children: [
          "Foobar ",
          {
            type: "span",
            attributes: {
              title:
                "Test title 2 - Jane Doe, Test title - John Doe, Test title 3 - John John",
            },
            children: ["[1, 2, 3]"],
          },
        ],
      },
    ],
  );
});

Deno.test(`citet`, () => {
  const input = String.raw`Foobar \citet{test24}`;

  assertEquals(
    parseLatex(input, {
      singles: cites({
        test24: {
          type: "ARTICLE",
          id: "test24",
          fields: {
            author: "John Doe",
            title: "Test title",
            year: "2024",
          },
        },
      }),
    }),
    [
      {
        type: "p",
        attributes: {},
        children: ["Foobar ", {
          type: "span",
          attributes: { title: "Test title - John Doe" },
          children: ["Doe (2024)"],
        }],
      },
    ],
  );
});

// TODO: Add more complex tests for citet

// TODO: Test \citep, \fullcite
// TODO: Test \ref, \nameref, \autoref - these need some lookup against labels
