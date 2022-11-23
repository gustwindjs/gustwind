import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { isComponent } from "../index.ts";

Deno.test("object with children is a component", () => {
  assertEquals(
    isComponent({
      children: "test",
    }),
    true,
  );
});

Deno.test("array with an object with children is a component", () => {
  assertEquals(
    isComponent([{
      children: "test",
    }]),
    true,
  );
});

Deno.test("object without children is not a component", () => {
  assertEquals(
    isComponent({
      foobar: "test",
    }),
    false,
  );
});

Deno.test("string is not a component", () => {
  assertEquals(
    isComponent("foobar"),
    false,
  );
});
