import assert from "node:assert/strict";
import test from "node:test";
import { htmlispToHTML } from "../mod.ts";

test("self-closing element without whitespace", async () => {
  assert.deepEqual(
    await htmlispToHTML({ htmlInput: `<hr/>` }),
    `<hr></hr>`,
  );
});

test("self-closing element with whitespace", async () => {
  assert.deepEqual(
    await htmlispToHTML({ htmlInput: `<hr />` }),
    `<hr></hr>`,
  );
});

test("self-closing element with an attribute", async () => {
  assert.deepEqual(
    await htmlispToHTML({ htmlInput: `<div title="bar"/>` }),
    `<div title="bar"></div>`,
  );
});

test("self-closing element with an attribute and whitespace", async () => {
  assert.deepEqual(
    await htmlispToHTML({ htmlInput: `<div title="bar" />` }),
    `<div title="bar"></div>`,
  );
});
