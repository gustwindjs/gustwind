import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { getParseDouble } from "./double.ts";
import { characterGenerator } from "../../characterGenerator.ts";

Deno.test(`simple expression`, () => {
  const input = "foobar";
  const arg = "demo";

  assertEquals(
    getParseDouble(
      {
        id: (i, arg) => ({
          type: "div",
          attributes: { id: arg || null },
          children: [i],
        }),
      },
    )(
      characterGenerator(String.raw`\id{${input}}{${arg}}`),
    ),
    { type: "div", attributes: { id: arg }, children: [input] },
  );
});

// TODO: Test that the logic throws in case a matching expression was not found
// TODO: Test that the logic throws in case an expression is incomplete
