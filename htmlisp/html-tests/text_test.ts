import assert from "node:assert/strict";
import test from "node:test";
import { htmlispToHTML } from "../mod.ts";

test("basic text", async () => {
  assert.deepEqual(
    await htmlispToHTML({ htmlInput: `foo` }),
    `foo`,
  );
});
