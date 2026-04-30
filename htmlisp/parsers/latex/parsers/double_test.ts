import assert from "node:assert/strict";
import test from "node:test";
import { getParseDouble } from "./double.ts";
import { characterGenerator } from "../../characterGenerator.ts";
import type { Element } from "../../../types.ts";

test(`simple expression`, () => {
  const input = "foobar";
  const arg = "demo";

  assert.deepEqual(
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

test(`braces in argument`, () => {
  const input = "foobar";
  const arg = "l|p{4.0cm}|p{5.0cm}";

  assert.deepEqual(
    getParseDouble<Element>(
      {
        begin: (i, arg) => ({
          type: "div",
          attributes: { id: arg || null },
          children: [i],
        }),
      },
    )(
      characterGenerator(String.raw`\begin{${input}}{${arg}}`),
    ).value,
    { type: "div", attributes: { id: arg }, children: [input] },
  );
});

test(`throws if argument is missing`, () => {
  assert.throws(
    () =>
      getParseDouble<Element>(
        { id: (i) => ({ type: "div", attributes: {}, children: [i] }) },
      )(characterGenerator(String.raw`\id{foobar}barfoo`)),
    Error,
    `Argument was missing`,
  );
});

test(`throws unless first character is a backslash`, () => {
  assert.throws(
    () =>
      getParseDouble<Element>(
        { id: (i) => ({ type: "div", attributes: {}, children: [i] }) },
      )(characterGenerator(String.raw`foobar \id{foobar}{barfoo}`)),
    Error,
    `No matching expression was found`,
  );
});

// TODO: Allow parsing expressions for the second parameter

// TODO: Test that the logic throws in case a matching expression was not found
// TODO: Test that the logic throws in case an expression is incomplete
