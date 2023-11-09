import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlToBreezewind } from "../mod.ts";

Deno.test("element with a type expression for noop type", () => {
  assertEquals(
    htmlToBreezewind(
      `<noop &type="(get props type)" />`,
    ),
    {
      type: { utility: "get", parameters: ["props", "type"] },
      children: [],
      attributes: {},
    },
  );
});

Deno.test("&foreach with noop", () => {
  assertEquals(
    htmlToBreezewind(
      `<noop &foreach="(get context blogPosts)">
        <div class="inline">
          <SiteLink
            &children="(get props data.title)"
            &href="(urlJoin blog / (get props data.slug))"
          />
        </div>
      </noop>
    `,
    ),
    {
      attributes: {},
      foreach: [{
        utility: "get",
        parameters: ["context", "blogPosts"],
      }, [{
        type: "div",
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

Deno.test("component with noop", () => {
  assertEquals(
    htmlToBreezewind(`<noop><div>foo</div></noop>`),
    [{ type: "div", children: "foo", attributes: {} }],
  );
});

Deno.test("component with noop and siblings", () => {
  assertEquals(
    htmlToBreezewind(`<noop><div>foo</div><div>bar</div></noop>`),
    [{ type: "div", children: "foo", attributes: {} }, {
      type: "div",
      children: "bar",
      attributes: {},
    }],
  );
});

Deno.test("noop with children", () => {
  assertEquals(
    htmlToBreezewind(`<noop &children="(render (get props content))" />`),
    {
      children: {
        utility: "render",
        parameters: [{ utility: "get", parameters: ["props", "content"] }],
      },
      attributes: {},
    },
  );
});
