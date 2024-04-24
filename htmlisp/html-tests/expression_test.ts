import { urlJoin } from "https://deno.land/x/url_join@1.0.0/mod.ts";
import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("element with an expression shortcut for attribute", () => {
  assertEquals(
    htmlispToHTML(
      {
        htmlInput: `<a &href="(get context href)">foobar</a>`,
        context: { href: "demo" },
      },
    ),
    `<a href="demo">foobar</a>`,
  );
});

Deno.test("element with braces inside strings", () => {
  assertEquals(
    htmlispToHTML(
      {
        htmlInput: `<a &href="(concat foo '(' bar ')' )" />`,
      },
    ),
    `<a href="foo(bar)"></a>`,
  );
});

Deno.test("element with expressions within an expression", () => {
  assertEquals(
    htmlispToHTML({
      htmlInput: `<a &href="(concat (get context demo) (get context href))" />`,
      context: { demo: "foobar", href: "demo" },
    }),
    `<a href="foobardemo"></a>`,
  );
});

Deno.test("element with a string after an expression after expression", () => {
  assertEquals(
    htmlispToHTML({
      htmlInput: `<a &href="(get (get context href) /)" />`,
      context: { href: "context", "/": "foo/bar" },
    }),
    `<a href="foo/bar"></a>`,
  );
});

Deno.test("complex expression", () => {
  assertEquals(
    htmlispToHTML({
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
