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

test(`no-argument expression`, () => {
  assert.deepEqual(
    getParseSingle<Element>(
      { id: (children) => ({ type: "div", attributes: {}, children }) },
    )(characterGenerator(String.raw`\id`)).value,
    { type: "div", attributes: {}, children: [] },
  );
});

test(`standalone expression leaves punctuation for the next parser`, () => {
  const generator = characterGenerator(String.raw`\id.`);

  assert.deepEqual(
    getParseSingle<Element>(
      { id: (children) => ({ type: "div", attributes: {}, children }) },
    )(generator).value,
    { type: "div", attributes: {}, children: [] },
  );
  assert.equal(generator.get(), ".");
});

test(`escaped expression content characters`, () => {
  assert.deepEqual(
    getParseSingle<Element>(
      { id: (children) => ({ type: "div", attributes: {}, children }) },
    )(characterGenerator(String.raw`\id{\%\{\}}`)).value,
    { type: "div", attributes: {}, children: ["%{}"] },
  );
});

test(`unknown nested expression is retained`, () => {
  assert.deepEqual(
    getParseSingle<Element>(
      { id: (children) => ({ type: "div", attributes: {}, children }) },
    )(characterGenerator(String.raw`\id{before \unknown{value} after}`)).value,
    {
      type: "div",
      attributes: {},
      children: ["before ", String.raw`\unknown{value} after`],
    },
  );
});

test(`unknown nested expression preserves balanced arguments`, () => {
  assert.deepEqual(
    getParseSingle<Element>(
      { id: (children) => ({ type: "div", attributes: {}, children }) },
    )(characterGenerator(String.raw`\id{before \unknown{a{b}} after}`)).value,
    {
      type: "div",
      attributes: {},
      children: ["before ", String.raw`\unknown{a{b}} after`],
    },
  );
});

test(`nested expression updates match counts`, () => {
  const matchCounts = {};

  assert.deepEqual(
    getParseSingle<Element>(
      {
        id: (children) => ({ type: "div", attributes: {}, children }),
        cite: (children) => ({
          type: "cite",
          attributes: {},
          children,
        }),
      },
    )(
      characterGenerator(String.raw`\id{before \cite{a,b} after}`),
      matchCounts,
    ).matchCounts,
    {
      cite: ["a", "b"],
      id: ["before a", "b after"],
    },
  );
});

test(`custom nested parser match counts replace parent counts`, () => {
  const parseCustom = (generator: ReturnType<typeof characterGenerator>) => {
    for (let i = 0; i < "\\custom".length; i++) {
      generator.next();
    }

    return {
      match: "custom",
      value: { type: "custom", attributes: {}, children: ["x"] },
      matchCounts: { custom: ["x"] },
    };
  };

  assert.deepEqual(
    getParseSingle<Element>(
      { id: (children) => ({ type: "div", attributes: {}, children }) },
      [parseCustom],
    )(characterGenerator(String.raw`\id{\custom}`)).matchCounts,
    {
      custom: ["x"],
      id: ["x"],
    },
  );
});

test(`non-matching nested parser result is retained as source`, () => {
  assert.deepEqual(
    getParseSingle<Element>(
      { id: (children) => ({ type: "div", attributes: {}, children }) },
      [() =>
        ({ match: false, value: "bad" }) as unknown as {
          match: string;
          value: Element;
        }],
    )(characterGenerator(String.raw`\id{\noop rest}`)).value,
    {
      type: "div",
      attributes: {},
      children: [String.raw`\noop rest`],
    },
  );
});

test(`match counts ignore nested objects without text children`, () => {
  const matchCounts = {};

  assert.deepEqual(
    getParseSingle<Element>(
      {
        id: (children) => ({ type: "div", attributes: {}, children }),
        icon: () => ({ type: "span" }) as unknown as Element,
      },
    )(characterGenerator(String.raw`\id{a \icon b}`), matchCounts).matchCounts,
    {
      id: ["a b"],
    },
  );
});

test(`match counts ignore undefined text children`, () => {
  assert.deepEqual(
    getParseSingle<Element>(
      {
        id: (children) => ({ type: "div", attributes: {}, children }),
        icon: () =>
          ({ type: "span", attributes: {}, children: undefined }) as unknown as
            Element,
      },
    )(characterGenerator(String.raw`\id{a \icon b}`), {}).matchCounts,
    {
      id: ["a b"],
    },
  );
});

test(`nested parser errors are propagated`, () => {
  assert.throws(
    () =>
      getParseSingle<Element>(
        { id: (children) => ({ type: "div", attributes: {}, children }) },
        [() => {
          throw new Error("Boom");
        }],
      )(characterGenerator(String.raw`\id{\boom}`)).value,
    { message: "Boom" },
  );
});

test(`throws unless first character is a backslash`, () => {
  assert.throws(
    () =>
      getParseSingle<Element>(
        { id: (children) => ({ type: "div", attributes: {}, children }) },
      )(characterGenerator(String.raw`foobar \id{foobar}`)).value,
    { message: "No matching expression was found" },
  );
});

test(`throws if expression name is not prefixed by a backslash`, () => {
  assert.throws(
    () =>
      getParseSingle<Element>(
        { id: (children) => ({ type: "div", attributes: {}, children }) },
      )(characterGenerator("id")).value,
    { message: "No matching expression was found" },
  );
});

test(`throws if a matching expression is not found`, () => {
  assert.throws(
    () =>
      getParseSingle<Element>(
        { id: (children) => ({ type: "div", attributes: {}, children }) },
      )(characterGenerator(String.raw`\unknown{foobar}`)).value,
    { message: "No matching expression was found" },
  );
});

test(`throws if an expression is incomplete`, () => {
  assert.throws(
    () =>
      getParseSingle<Element>(
        { id: (children) => ({ type: "div", attributes: {}, children }) },
      )(characterGenerator(String.raw`\id{foobar`)).value,
    { message: "No matching expression was found" },
  );
});
