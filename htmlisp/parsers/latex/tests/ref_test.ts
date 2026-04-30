import assert from "node:assert/strict";
import test from "node:test";
import { refs } from "../defaultExpressions.ts";
import { parseLatex } from "../parseLatex.ts";

test(`nameref`, () => {
  const input = String.raw`Foobar \nameref{ch:test}`;
  const ref = {
    title: "Test",
    label: "ch:test",
    slug: "test",
  };

  assert.deepEqual(
    parseLatex(input, {
      singles: refs([ref]),
    }),
    [
      {
        type: "p",
        attributes: {},
        children: ["Foobar ", {
          type: "a",
          attributes: { href: ref.slug },
          children: [ref.title],
        }],
      },
    ],
  );
});

test(`nameref not found`, () => {
  const input = String.raw`Foobar \nameref{ch:test}`;
  const ref = {
    title: "Test",
    label: "ch:testbar",
    slug: "test",
  };

  assert.throws(
    () =>
      parseLatex(input, {
        singles: refs([ref]),
      }),
    Error,
    `No matching ref was found`,
  );
});
