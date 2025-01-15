import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { refs } from "../defaultExpressions.ts";
import { parseLatex } from "../parseLatex.ts";

Deno.test(`nameref`, () => {
  const input = String.raw`Foobar \nameref{ch:test}`;
  const ref = {
    title: "Test",
    label: "ch:test",
    slug: "test",
  };

  assertEquals(
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

Deno.test(`nameref not found`, () => {
  const input = String.raw`Foobar \nameref{ch:test}`;
  const ref = {
    title: "Test",
    label: "ch:testbar",
    slug: "test",
  };

  assertThrows(
    () =>
      parseLatex(input, {
        singles: refs([ref]),
      }),
    Error,
    `No matching ref was found`,
  );
});
