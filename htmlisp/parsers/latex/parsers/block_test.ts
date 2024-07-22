import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseBlock } from "./block.ts";
import { characterGenerator } from "../../characterGenerator.ts";

Deno.test(`simple expression`, () => {
  const name = "verbatim";
  const input = "foobar";

  assertEquals(
    parseBlock(
      characterGenerator(String.raw`\begin{${name}}${input}\end{${name}}`),
      {
        [name]: (content) => ({
          type: "div",
          attributes: {},
          children: [content],
        }),
      },
    ),
    { type: "div", attributes: {}, children: [input] },
  );
});

// TODO: Assert that begin/end block names are the same - if not, throw
// TODO: Test that the logic throws in case a matching expression was not found
// TODO: Test that the logic throws in case an expression is incomplete
