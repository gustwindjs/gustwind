import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { getParseDouble } from "./double.ts";
import { characterGenerator } from "../../characterGenerator.ts";
import type { Element } from "../../../types.ts";

Deno.test(`simple expression`, () => {
  const input = "foobar";
  const arg = "demo";

  assertEquals(
    getParseDouble<Element>(
      {
        id: (i, arg) => ({
          type: "div",
          attributes: { id: arg || null },
          children: [i],
        }),
      },
    )(
      characterGenerator(String.raw`\id{${input}}{${arg}}`),
    ).value,
    { type: "div", attributes: { id: arg }, children: [input] },
  );
});

Deno.test(`throws unless first character is a backslash`, () => {
  assertThrows(
    () =>
      getParseDouble<Element>(
        { id: (i) => ({ type: "div", attributes: {}, children: [i] }) },
      )(characterGenerator(String.raw`foobar \id{foobar}{barfoo}`)),
    Error,
    `No matching expression was found`,
  );
});

// TODO: Test that the logic throws in case a matching expression was not found
// TODO: Test that the logic throws in case an expression is incomplete
