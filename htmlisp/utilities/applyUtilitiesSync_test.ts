import assert from "node:assert/strict";
import test from "node:test";
import { applyUtilitiesSync } from "./applyUtilitiesSync.ts";

test("does not apply empty", async () => {
  assert.deepEqual(
    await applyUtilitiesSync({}, {}, {}),
    {},
  );
});

test("does not apply a number", async () => {
  const props = { foo: 5 };

  assert.deepEqual(
    await applyUtilitiesSync(props, {}, {}),
    props,
  );
});

test("does not apply a string", async () => {
  const props = { foo: "bar" };

  assert.deepEqual(
    await applyUtilitiesSync(props, {}, {}),
    props,
  );
});

test("does not apply a date", async () => {
  const props = { foo: new Date() };

  assert.deepEqual(
    await applyUtilitiesSync(props, {}, {}),
    props,
  );
});

// TODO: Add more tests
