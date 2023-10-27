import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { stringToObject } from "../mod.ts";

Deno.test("array to json", () => {
  assertEquals(
    stringToObject(`[]`),
    [],
  );
});

Deno.test("object to json", () => {
  assertEquals(
    stringToObject(`{}`),
    {},
  );
});

Deno.test("complex object to json", () => {
  assertEquals(
    stringToObject(
      `{ 'utility': 'concat', 'parameters': [ { 'utility': 'testUtility', 'parameters': ['hello'] }, ' ', 'world!' ]}`,
    ),
    {
      utility: "concat",
      parameters: [
        { utility: "testUtility", parameters: ["hello"] },
        " ",
        "world!",
      ],
    },
  );
});
