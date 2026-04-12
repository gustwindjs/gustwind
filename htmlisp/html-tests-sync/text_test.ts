import assert from "node:assert/strict";
import test from "node:test";
import { htmlispToHTMLSync } from "../mod.ts";

test("basic text", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({ htmlInput: `foo` }),
    `foo`,
  );
});
