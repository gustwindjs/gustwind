import { urlJoin } from "https://deno.land/x/url_join@1.0.0/mod.ts";
import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("element with an expression shortcut for attribute", async () => {
  assertEquals(
    await htmlispToHTML(
      {
        htmlInput: `<a &href="(get context href)" />`,
        context: { href: "demo" },
      },
    ),
    `<a href="demo"></a>`,
  );
});

Deno.test("element with braces inside strings", async () => {
  assertEquals(
    await htmlispToHTML(
      {
        htmlInput: `<a &href="(concat foo '(' bar ')' )" />`,
      },
    ),
    `<a href="foo(bar)"></a>`,
  );
});

Deno.test("element with expressions within an expression", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<a &href="(concat (get context demo) (get context href))" />`,
      context: { demo: "foobar", href: "demo" },
    }),
    `<a href="foobardemo"></a>`,
  );
});

Deno.test("element with custom utilities", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput:
        `<a &href="(urlJoin (get context href) (get context suffix))" />`,
      utilities: { urlJoin },
      context: { href: "foo", suffix: "bar" },
    }),
    `<a href="foo/bar"></a>`,
  );
});

Deno.test("element with a string after an expression after expression", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<a &href="(get (get context href) /)" />`,
      context: { href: "context", "/": "foo/bar" },
    }),
    `<a href="foo/bar"></a>`,
  );
});

Deno.test("element with an expression shortcut for children", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div &children="(get context href)" />`,
      context: { href: "foobar" },
    }),
    `<div>foobar</div>`,
  );
});

Deno.test("element with a nested expression shortcut for children", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div &children="(concat / (get context href))" />`,
      context: { href: "foobar" },
    }),
    `<div>/foobar</div>`,
  );
});

Deno.test("element with a complex nested expression shortcut for children", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div &children="(urlJoin / (get context href) /)" />`,
      context: { href: "foobar" },
      utilities: { urlJoin },
    }),
    `<div>/foobar/</div>`,
  );
});

Deno.test("complex expression", async () => {
  assertEquals(
    await htmlispToHTML({
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

// TODO
/*
Deno.test("&foreach", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<ul &foreach="(get context blogPosts)">
        <li class="inline" &title="(get context title)" &children="(get context content)">
        </li>
      </ul>
    `,
      context: {
        blogPosts: [{ title: "foo", content: "bar" }],
      },
      utilities: { urlJoin },
    }),
    `<ul><li class="inline" title="foo">bar</li></ul>`,
  );
});
*/

Deno.test("element with a visibleIf enabled", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div &visibleIf="(get context showToc)">foo</div>`,
      context: {
        showToc: false,
      },
    }),
    "",
  );
});

Deno.test("element with a visibleIf disabled", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div &visibleIf="(get context showToc)">foo</div>`,
      context: {
        showToc: true,
      },
    }),
    "<div>foo</div>",
  );
});

/*
Deno.test("element with a visibleIf and multiple checks", () => {
  assertEquals(
    htmlispToHTML(
      `<div &visibleIf="(and (get props showToc) (get props isAdmin))">foo</div>`,
    ),
    {
      type: "div",
      children: "foo",
      visibleIf: {
        utility: "and",
        parameters: [{ utility: "get", parameters: ["props", "showToc"] }, {
          utility: "get",
          parameters: ["props", "isAdmin"],
        }],
      },
      attributes: {},
    },
  );
});

Deno.test("element with a class", () => {
  assertEquals(
    htmlispToHTML(
      `<div &class="(pick (get props href) font-bold)">foo</div>`,
    ),
    {
      type: "div",
      children: "foo",
      bindToProps: {
        class: {
          utility: "pick",
          parameters: [
            { utility: "get", parameters: ["props", "href"] },
            "font-bold",
          ],
        },
      },
      attributes: { class: { utility: "get", parameters: ["props", "class"] } },
    },
  );
});
*/
