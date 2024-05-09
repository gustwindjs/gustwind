import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { applyUtilities } from "./applyUtilities.ts";

Deno.test("does not apply empty", async () => {
  assertEquals(
    await applyUtilities({}, {}, {}),
    {},
  );
});

Deno.test("does not apply a number", async () => {
  const props = { foo: 5 };

  assertEquals(
    await applyUtilities(props, {}, {}),
    props,
  );
});

Deno.test("does not apply a string", async () => {
  const props = { foo: "bar" };

  assertEquals(
    await applyUtilities(props, {}, {}),
    props,
  );
});

Deno.test("does not apply a date", async () => {
  const props = { foo: new Date() };

  assertEquals(
    await applyUtilities(props, {}, {}),
    props,
  );
});

// TODO: Add more tests
