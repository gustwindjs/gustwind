import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import htmlToBreezewind from "../index.ts";

Deno.test("basic component", () => {
  assertEquals(
    // TODO: the problem is that HTML tagName loses original casing
    htmlToBreezewind(`<Button>foo</Button>`),
    {
      type: "Button",
      children: "foo",
      attributes: {},
    },
  );
});

// TODO: Test a component
// TODO: Test prop handling
// TODO: Test prop children
// TODO: Test Noop
