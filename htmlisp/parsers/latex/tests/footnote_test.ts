import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { cites } from "../defaultExpressions.ts";
import { parseLatex } from "../parseLatex.ts";

Deno.test(`footnote`, () => {
  const input = String.raw`Foobar \footnote{Test}`;

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
          type: "sup",
          attributes: { title: "Test" },
          children: ["1"],
        }],
      },
    ],
  );
});

Deno.test(`multiple footnotes`, () => {
  const input = String.raw`Foobar \footnote{Test}

Barfoo \footnote{Foo}`;

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
