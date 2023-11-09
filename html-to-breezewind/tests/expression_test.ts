import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlToBreezewind } from "../mod.ts";

Deno.test("element with an expression shortcut for attribute", () => {
  assertEquals(
    htmlToBreezewind(
      `<a &href="(get props href)" />`,
    ),
    {
      type: "a",
      attributes: { href: { utility: "get", parameters: ["props", "href"] } },
      children: [],
    },
  );
});

Deno.test("element with braces inside strings", () => {
  assertEquals(
    htmlToBreezewind(
      `<a &href="(concat foo '(' bar ')' )" />`,
    ),
    {
      type: "a",
      attributes: {
        href: { utility: "concat", parameters: ["foo", "(", "bar", ")"] },
      },
      children: [],
    },
  );
});

Deno.test("element with an expression after expression", () => {
  assertEquals(
    htmlToBreezewind(
      `<a &href="(get (get props href))" />`,
    ),
    {
      type: "a",
      attributes: {
        href: {
          utility: "get",
          parameters: [{ utility: "get", parameters: ["props", "href"] }],
        },
      },
      children: [],
    },
  );
});

Deno.test("element with multiple expressions", () => {
  assertEquals(
    htmlToBreezewind(
      `<a &href="(urlJoin (get props href) (get props suffix))" />`,
    ),
    {
      type: "a",
      attributes: {
        href: {
          utility: "urlJoin",
          parameters: [
            { utility: "get", parameters: ["props", "href"] },
            { utility: "get", parameters: ["props", "suffix"] },
          ],
        },
      },
      children: [],
    },
  );
});

Deno.test("element with a string after an expression after expression", () => {
  assertEquals(
    htmlToBreezewind(
      `<a &href="(get (get props href) /)" />`,
    ),
    {
      type: "a",
      attributes: {
        href: {
          utility: "get",
          parameters: [{ utility: "get", parameters: ["props", "href"] }, "/"],
        },
      },
      children: [],
    },
  );
});

Deno.test("element with an expression and multiple parameters", () => {
  assertEquals(
    htmlToBreezewind(
      `<a &href="(echo hello ' ' world!)" />`,
    ),
    {
      type: "a",
      attributes: {
        href: { utility: "echo", parameters: ["hello", " ", "world!"] },
      },
      children: [],
    },
  );
});

Deno.test("element with a nested expression shortcut for attribute", () => {
  assertEquals(
    htmlToBreezewind(
      `<a &href="(urlJoin / (get props href))" />`,
    ),
    {
      type: "a",
      attributes: {
        href: {
          utility: "urlJoin",
          parameters: ["/", { utility: "get", parameters: ["props", "href"] }],
        },
      },
      children: [],
    },
  );
});

Deno.test("element with an expression shortcut for children", () => {
  assertEquals(
    htmlToBreezewind(
      `<div &children="(get props href)" />`,
    ),
    {
      type: "div",
      children: { utility: "get", parameters: ["props", "href"] },
      attributes: {},
    },
  );
});

Deno.test("element with a nested expression shortcut for children", () => {
  assertEquals(
    htmlToBreezewind(
      `<div &children="(concat / (get props href))" />`,
    ),
    {
      type: "div",
      children: {
        utility: "concat",
        parameters: ["/", { utility: "get", parameters: ["props", "href"] }],
      },
      attributes: {},
    },
  );
});

Deno.test("element with a complex nested expression shortcut for children", () => {
  assertEquals(
    htmlToBreezewind(
      `<div &children="(urlJoin / (get props href) /)" />`,
    ),
    {
      type: "div",
      children: {
        utility: "urlJoin",
        parameters: [
          "/",
          { utility: "get", parameters: ["props", "href"] },
          "/",
        ],
      },
      attributes: {},
    },
  );
});

Deno.test("complex expression", () => {
  assertEquals(
    htmlToBreezewind(
      `<a
        &href="(urlJoin (get context meta.url) / blog / (get props data.slug) /)"
      ></a>`,
    ),
    {
      type: "a",
      children: [],
      attributes: {
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
    },
  );
});

Deno.test("&foreach", () => {
  assertEquals(
    htmlToBreezewind(
      `<ul &foreach="(get context blogPosts)">
        <li class="inline">
          <SiteLink
            &children="(get props data.title)"
            &href="(urlJoin blog / (get props data.slug))"
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
                  "/",
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
    htmlToBreezewind(`<div &visibleIf="(get props showToc)">foo</div>`),
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
    htmlToBreezewind(
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
    htmlToBreezewind(
      `<div &class="(pick (get props href) font-bold)">foo</div>`,
    ),
    {
      type: "div",
      children: "foo",
      attributes: {
        class: {
          utility: "pick",
          parameters: [
            { utility: "get", parameters: ["props", "href"] },
            "font-bold",
          ],
        },
      },
    },
  );
});

Deno.test("element with a class list", () => {
  assertEquals(
    htmlToBreezewind(
      `<div &class[0]="(id underline)" &class[1]="(pick (get props href) font-bold)">foo</div>`,
    ),
    {
      type: "div",
      children: "foo",
      attributes: {
        class: {
          utility: "concat",
          parameters: [
            { utility: "id", parameters: ["underline"] },
            " ",
            {
              utility: "pick",
              parameters: [
                { utility: "get", parameters: ["props", "href"] },
                "font-bold",
              ],
            },
          ],
        },
      },
    },
  );
});

// TODO: Support &class[0]="underline" style syntax
