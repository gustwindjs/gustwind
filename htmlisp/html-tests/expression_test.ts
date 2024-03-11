import { urlJoin } from "https://deno.land/x/url_join@1.0.0/mod.ts";
import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

// TODO: Show usage of custom utilities

Deno.test("element with an expression shortcut for attribute", async () => {
  assertEquals(
    await htmlispToHTML(
      {
        htmlInput: `<a &href="(get props href)" />`,
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
      htmlInput: `<a &href="(concat (get props demo) (get props href))" />`,
      context: { demo: "foobar", href: "demo" },
    }),
    `<a href="foobardemo"></a>`,
  );
});

Deno.test("element with custom utilities", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<a &href="(urlJoin (get props href) (get props suffix))" />`,
      utilities: { urlJoin },
      context: { href: "foo", suffix: "bar" },
    }),
    `<a href="foo/bar"></a>`,
  );
});

Deno.test("element with a string after an expression after expression", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<a &href="(get (get props href) /)" />`,
      context: { href: "props", "/": "foo/bar" },
    }),
    `<a href="foo/bar"></a>`,
  );
});

Deno.test("element with an expression shortcut for children", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div &children="(get props href)" />`,
      context: { href: "foobar" },
    }),
    `<div>foobar</div>`,
  );
});

Deno.test("element with a nested expression shortcut for children", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div &children="(concat / (get props href))" />`,
      context: { href: "foobar" },
    }),
    `<div>/foobar</div>`,
  );
});

Deno.test("element with a complex nested expression shortcut for children", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div &children="(urlJoin / (get props href) /)" />`,
      context: { href: "foobar" },
      utilities: { urlJoin },
    }),
    `<div>/foobar/</div>`,
  );
});

/*
Deno.test("complex expression", () => {
  assertEquals(
    htmlispToHTML(
      `<a
        &href="(urlJoin (get context meta.url) / blog / (get props data.slug) /)"
      ></a>`,
    ),
    {
      type: "a",
      children: [],
      bindToProps: {
        href: {
          utility: "urlJoin",
          parameters: [
            { utility: "get", parameters: ["context", "meta.url"] },
            "/",
            "blog",
            "/",
            { utility: "get", parameters: ["props", "data.slug"] },
            "/",
          ],
        },
      },
      attributes: { href: { utility: "get", parameters: ["props", "href"] } },
    },
  );
});

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
