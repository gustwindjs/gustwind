import assert from "node:assert/strict";
import test from "node:test";
import { cites } from "../defaultExpressions.ts";
import { parseLatex } from "../parseLatex.ts";

test(`cite`, () => {
  const input = String.raw`Foobar \cite{test24}`;

  assert.deepEqual(
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

test(`cite with a tilde`, () => {
  const input = String.raw`Foobar~\cite{test24}`;

  assert.deepEqual(
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

test(`cite twice to the same reference`, () => {
  const input = String.raw`Foobar \cite{test24} \cite{test24}`;

  assert.deepEqual(
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

test(`cite to different references`, () => {
  const input = String.raw`Foobar \cite{test24} \cite{test12}`;

  assert.deepEqual(
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

test(`cite to two different references`, () => {
  const input = String.raw`Foobar \cite{test12, test24}`;

  assert.deepEqual(
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

test(`cite to three different references`, () => {
  const input = String.raw`Foobar \cite{test12, test24, test36}`;

  assert.deepEqual(
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

test(`citet`, () => {
  const input = String.raw`Foobar \citet{test24}`;

  assert.deepEqual(
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

test(`citet surname from multiple authors`, () => {
  const input = String.raw`Foobar \citet{test24}`;

  assert.deepEqual(
    parseLatex(input, {
      singles: cites({
        test24: {
          type: "ARTICLE",
          id: "test24",
          fields: {
            author: "Doe, John and Jane Smith",
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
          attributes: { title: "Test title - Doe, John and Jane Smith" },
          children: ["Doe (2024)"],
        }],
      },
    ],
  );
});

test(`citep`, () => {
  const input = String.raw`Foobar \citep{test24}`;

  assert.deepEqual(
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
          children: ["(Doe, 2024)"],
        }],
      },
    ],
  );
});

test(`citep twice to the same reference`, () => {
  const input = String.raw`Foobar \citep{test24} \citep{test24}`;

  assert.deepEqual(
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
        children: [
          "Foobar ",
          {
            type: "span",
            attributes: { title: "Test title - John Doe" },
            children: ["(Doe, 2024)"],
          },
          " ",
          {
            type: "span",
            attributes: { title: "Test title - John Doe" },
            children: ["(Doe, 2024)"],
          },
        ],
      },
    ],
  );
});

test(`citep with multiple references`, () => {
  const input = String.raw`Foobar \citep{test24, test12}`;

  assert.deepEqual(
    parseLatex(input, {
      singles: cites({
        test12: {
          type: "ARTICLE",
          id: "test12",
          fields: {
            author: "Jane Smith and John Jones",
            title: "Test title 2",
            year: "2025",
          },
        },
        test24: {
          type: "ARTICLE",
          id: "test24",
          fields: {
            author: "Doe, John and Jane Smith",
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
          attributes: {
            title: "Test title - Doe, John and Jane Smith, Test title 2 - Jane Smith and John Jones",
          },
          children: ["(Doe et al., 2024; Smith et al., 2025)"],
        }],
      },
    ],
  );
});

// TODO: Test \fullcite
// TODO: Test \ref, \nameref, \autoref - these need some lookup against labels
