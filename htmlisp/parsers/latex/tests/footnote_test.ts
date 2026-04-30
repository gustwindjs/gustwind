import assert from "node:assert/strict";
import test from "node:test";
import { cites } from "../defaultExpressions.ts";
import { parseLatex } from "../parseLatex.ts";

test(`footnote`, () => {
  const input = String.raw`Foobar \footnote{Test}`;

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
          type: "sup",
          attributes: { title: "Test" },
          children: ["1"],
        }],
      },
    ],
  );
});

test(`multiple footnotes`, () => {
  const input = String.raw`Foobar \footnote{Test}

Barfoo \footnote{Foo}`;

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
          type: "sup",
          attributes: { title: "Test" },
          children: ["1"],
        }],
      },
      {
        type: "p",
        attributes: {},
        children: ["Barfoo ", {
          type: "sup",
          attributes: { title: "Foo" },
          children: ["2"],
        }],
      },
    ],
  );
});
