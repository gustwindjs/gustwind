import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { applyUtilitiesSync } from "./applyUtilitiesSync.ts";

Deno.test("does not apply empty", async () => {
  assertEquals(
    await applyUtilitiesSync({}, {}, {}),
    {},
  );
});

Deno.test("does not apply a number", async () => {
  const props = { foo: 5 };

  assertEquals(
    await applyUtilitiesSync(props, {}, {}),
    props,
  );
});

Deno.test("does not apply a string", async () => {
  const props = { foo: "bar" };

  assertEquals(
    await applyUtilitiesSync(props, {}, {}),
    props,
  );
});

Deno.test("does not apply a date", async () => {
  const props = { foo: new Date() };

  assertEquals(
    await applyUtilitiesSync(props, {}, {}),
    props,
  );
});

// TODO: Add more tests
