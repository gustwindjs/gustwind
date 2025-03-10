import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { getParseSingle } from "./single.ts";
import { characterGenerator } from "../../characterGenerator.ts";
import type { Element } from "../../../types.ts";

Deno.test(`simple expression`, () => {
  const input = "foobar";

  assertEquals(
    getParseSingle<Element>(
      { id: (children) => ({ type: "div", attributes: {}, children }) },
    )({
      getCharacter: characterGenerator(String.raw`\id{${input}}`),
    }).value,
    { type: "div", attributes: {}, children: [input] },
  );
});

Deno.test(`expression within expression`, () => {
  const input = "foobar";

  assertEquals(
    getParseSingle<Element>(
      { id: (children) => ({ type: "div", attributes: {}, children }) },
    )({
      getCharacter: characterGenerator(String.raw`\id{\id{${input}}}`),
    })
      .value,
    {
      type: "div",
      attributes: {},
      children: [{ type: "div", attributes: {}, children: [input] }],
    },
  );
});

Deno.test(`expression within expression 2`, () => {
  const input = "foobar";

  assertEquals(
    getParseSingle<Element>(
      { id: (children) => ({ type: "div", attributes: {}, children }) },
    )({
      getCharacter: characterGenerator(String.raw`\id{foo \id{${input}} bar}`),
    }).value,
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

Deno.test(`throws unless first character is a backslash`, () => {
  assertThrows(
    () =>
      getParseSingle<Element>(
        { id: (children) => ({ type: "div", attributes: {}, children }) },
      )({
        getCharacter: characterGenerator(String.raw`foobar \id{foobar}`),
      })
        .value,
    Error,
    `No matching expression was found`,
  );
});

// TODO: Test that the logic throws in case a matching expression was not found
// TODO: Test that the logic throws in case an expression is incomplete
