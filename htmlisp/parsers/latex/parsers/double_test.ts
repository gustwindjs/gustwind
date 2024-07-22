import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseDouble } from "./double.ts";
import { characterGenerator } from "../../characterGenerator.ts";

Deno.test(`simple expression`, () => {
  const input = "foobar";
  const arg = "demo";

  assertEquals(
    parseDouble(
      characterGenerator(String.raw`\id{${input}}{${arg}}`),
      {
        id: (i, arg) => ({
          type: "div",
          attributes: { id: arg || null },
          children: [i],
        }),
      },
    ),
    { type: "div", attributes: { id: arg }, children: [input] },
  );
});

// TODO: Test that the logic throws in case a matching expression was not found
// TODO: Test that the logic throws in case an expression is incomplete
