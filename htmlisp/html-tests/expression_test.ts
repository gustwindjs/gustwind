import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("element with an expression shortcut for attribute", () => {
  assertEquals(
    htmlispToHTML(
      {
        htmlInput: `<a &href="(get props href)" />`,
        context: { href: "demo" },
      },
    ),
    `<a href="demo"></a>`,
  );
});

// TODO: Restore these
// TODO: Show usage of custom utilities
/*
Deno.test("element with braces inside strings", () => {
  assertEquals(
    htmlispToHTML(
      `<a &href="(concat foo '(' bar ')' )" />`,
    ),
    {
      type: "a",
      bindToProps: {
        href: { utility: "concat", parameters: ["foo", "(", "bar", ")"] },
      },
      attributes: { href: { utility: "get", parameters: ["props", "href"] } },
      children: [],
    },
  );
});

Deno.test("element with an expression after expression", () => {
  assertEquals(
    htmlispToHTML(
      `<a &href="(get (get props href))" />`,
    ),
    {
      type: "a",
      bindToProps: {
        href: {
          utility: "get",
          parameters: [{ utility: "get", parameters: ["props", "href"] }],
        },
      },
      attributes: { href: { utility: "get", parameters: ["props", "href"] } },
      children: [],
    },
  );
});

Deno.test("element with multiple expressions", () => {
  assertEquals(
    htmlispToHTML(
      `<a &href="(urlJoin (get props href) (get props suffix))" />`,
    ),
    {
      type: "a",
      bindToProps: {
        href: {
          utility: "urlJoin",
          parameters: [
            { utility: "get", parameters: ["props", "href"] },
            { utility: "get", parameters: ["props", "suffix"] },
          ],
        },
      },
      attributes: { href: { utility: "get", parameters: ["props", "href"] } },
      children: [],
    },
  );
});

Deno.test("element with a string after an expression after expression", () => {
  assertEquals(
    htmlispToHTML(
      `<a &href="(get (get props href) /)" />`,
    ),
    {
      type: "a",
      bindToProps: {
        href: {
          utility: "get",
          parameters: [{ utility: "get", parameters: ["props", "href"] }, "/"],
        },
      },
      attributes: { href: { utility: "get", parameters: ["props", "href"] } },
      children: [],
    },
  );
});

Deno.test("element with an expression and multiple parameters", () => {
  assertEquals(
    htmlispToHTML(
      `<a &href="(echo hello ' ' world!)" />`,
    ),
    {
      type: "a",
      bindToProps: {
        href: { utility: "echo", parameters: ["hello", " ", "world!"] },
      },
      attributes: { href: { utility: "get", parameters: ["props", "href"] } },
      children: [],
    },
  );
});

Deno.test("element with a nested expression shortcut for attribute", () => {
  assertEquals(
    htmlispToHTML(
      `<a &href="(urlJoin / (get props href))" />`,
    ),
    {
      type: "a",
      bindToProps: {
        href: {
          utility: "urlJoin",
          parameters: ["/", { utility: "get", parameters: ["props", "href"] }],
        },
      },
      attributes: { href: { utility: "get", parameters: ["props", "href"] } },
      children: [],
    },
  );
});

Deno.test("element with an expression shortcut for children", () => {
  assertEquals(
    htmlispToHTML(
      `<div &children="(get props href)" />`,
    ),
    {
      type: "div",
      bindToProps: {
        children: { utility: "get", parameters: ["props", "href"] },
      },
      children: { utility: "get", parameters: ["props", "children"] },
      attributes: {},
    },
  );
});

Deno.test("element with a nested expression shortcut for children", () => {
  assertEquals(
    htmlispToHTML(
      `<div &children="(concat / (get props href))" />`,
    ),
    {
      type: "div",
      bindToProps: {
        children: {
          utility: "concat",
          parameters: ["/", { utility: "get", parameters: ["props", "href"] }],
        },
      },
      children: { utility: "get", parameters: ["props", "children"] },
      attributes: {},
    },
  );
});

Deno.test("element with a complex nested expression shortcut for children", () => {
  assertEquals(
    htmlispToHTML(
      `<div &children="(urlJoin / (get props href) /)" />`,
    ),
    {
      type: "div",
      bindToProps: {
        children: {
          utility: "urlJoin",
          parameters: [
            "/",
            { utility: "get", parameters: ["props", "href"] },
            "/",
          ],
        },
      },
      children: { utility: "get", parameters: ["props", "children"] },
      attributes: {},
    },
  );
});

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
