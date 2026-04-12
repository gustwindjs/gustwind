import assert from "node:assert/strict";
import test from "node:test";
import { htmlispToHTMLSync } from "../mod.ts";

test("self-closing element without whitespace", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({ htmlInput: `<hr/>` }),
    `<hr></hr>`,
  );
});

test("self-closing element with whitespace", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({ htmlInput: `<hr />` }),
    `<hr></hr>`,
  );
});

test("self-closing element with an attribute", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({ htmlInput: `<div title="bar"/>` }),
    `<div title="bar"></div>`,
  );
});

test("self-closing element with an attribute and whitespace", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({ htmlInput: `<div title="bar" />` }),
    `<div title="bar"></div>`,
  );
});
