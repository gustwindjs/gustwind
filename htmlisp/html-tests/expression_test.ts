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

/*
Deno.test("&foreach", () => {
  assertEquals(
    htmlispToHTML(
      `<ul &foreach="(get context blogPosts)">
        <li class="inline">
          <SiteLink
            &children="(get props data.title)"
            &href="(urlJoin blog (get props data.slug))"
          />
        </li>
      </ul>
    `,
    ),
    {
      type: "ul",
      attributes: {},
      foreach: [{
        utility: "get",
        parameters: ["context", "blogPosts"],
      }, [{
        type: "li",
        attributes: {
          class: "inline",
        },
        children: [
          {
            type: "SiteLink",
            bindToProps: {
              children: {
                utility: "get",
                parameters: ["props", "data.title"],
              },
              href: {
                utility: "urlJoin",
                parameters: [
                  "blog",
                  {
                    "utility": "get",
                    "parameters": ["props", "data.slug"],
                  },
                ],
              },
            },
            children: [],
            props: {},
          },
        ],
      }]],
    },
  );
});

Deno.test("element with a visibleIf", () => {
  assertEquals(
    htmlispToHTML(`<div &visibleIf="(get props showToc)">foo</div>`),
    {
      type: "div",
      children: "foo",
      visibleIf: { utility: "get", parameters: ["props", "showToc"] },
      attributes: {},
    },
  );
});

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
