import assert from "node:assert/strict";
import test from "node:test";
import { getParseSingle } from "./single.ts";
import { characterGenerator } from "../../characterGenerator.ts";
import type { Element } from "../../../types.ts";

test(`simple expression`, () => {
  const input = "foobar";

  assert.deepEqual(
    getParseSingle<Element>(
      { id: (children) => ({ type: "div", attributes: {}, children }) },
    )(characterGenerator(String.raw`\id{${input}}`)).value,
    { type: "div", attributes: {}, children: [input] },
  );
});

test(`expression within expression`, () => {
  const input = "foobar";

  assert.deepEqual(
    getParseSingle<Element>(
      { id: (children) => ({ type: "div", attributes: {}, children }) },
    )(characterGenerator(String.raw`\id{\id{${input}}}`)).value,
    {
      type: "div",
      attributes: {},
      children: [{ type: "div", attributes: {}, children: [input] }],
    },
  );
});

test(`expression within expression 2`, () => {
  const input = "foobar";

  assert.deepEqual(
    getParseSingle<Element>(
      { id: (children) => ({ type: "div", attributes: {}, children }) },
    )(characterGenerator(String.raw`\id{foo \id{${input}} bar}`)).value,
    {
      type: "div",
      attributes: {},
      children: [
        "foo ",
        { type: "div", attributes: {}, children: [input] },
        " bar",
      ],
    },
  );
});

test(`throws unless first character is a backslash`, () => {
  assert.throws(
    () =>
      getParseSingle<Element>(
        { id: (children) => ({ type: "div", attributes: {}, children }) },
      )(characterGenerator(String.raw`foobar \id{foobar}`)).value,
    Error,
    `No matching expression was found`,
  );
});

// TODO: Test that the logic throws in case a matching expression was not found
// TODO: Test that the logic throws in case an expression is incomplete
