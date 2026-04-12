import { urlJoin } from "../../utilities/urlJoin.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { htmlispToHTMLSync } from "../mod.ts";

test("element with an expression shortcut for attribute", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync(
      {
        htmlInput: `<a &href="(get context href)">foobar</a>`,
        context: { href: "demo" },
      },
    ),
    `<a href="demo">foobar</a>`,
  );
});

test("element with braces inside strings", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync(
      {
        htmlInput: `<a &href="(concat foo '(' bar ')' )" />`,
      },
    ),
    `<a href="foo(bar)"></a>`,
  );
});

test("element with expressions within an expression", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<a &href="(concat (get context demo) (get context href))" />`,
      context: { demo: "foobar", href: "demo" },
    }),
    `<a href="foobardemo"></a>`,
  );
});

test("element with a string after an expression after expression", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<a &href="(get (get context href) /)" />`,
      context: { href: "context", "/": "foo/bar" },
    }),
    `<a href="foo/bar"></a>`,
  );
});

test("complex expression", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<a
        &href="(urlJoin (get context meta.url) blog (get context data.slug))"
      ></a>`,
      context: {
        meta: {
          url: "foo",
        },
        data: {
          slug: "bar",
        },
      },
      utilities: { urlJoin },
    }),
    `<a href="foo/blog/bar"></a>`,
  );
});
