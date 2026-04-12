import { urlJoin } from "../../utilities/urlJoin.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { htmlispToHTMLSync } from "../mod.ts";

test("element with an expression shortcut for children", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<div &children="(get context href)" />`,
      context: { href: "foobar" },
    }),
    `<div>foobar</div>`,
  );
});

test("element with a nested expression shortcut for children", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<div &children="(concat / (get context href))" />`,
      context: { href: "foobar" },
    }),
    `<div>/foobar</div>`,
  );
});

test("element with a complex nested expression shortcut for children", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<div &children="(urlJoin / (get context href) /)" />`,
      context: { href: "foobar" },
      utilities: { urlJoin },
    }),
    `<div>/foobar/</div>`,
  );
});
