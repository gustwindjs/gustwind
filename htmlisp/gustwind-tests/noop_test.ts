import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToBreezewind } from "../mod.ts";

Deno.test("element with a type expression for noop type", () => {
  assertEquals(
    htmlispToBreezewind(
      `<noop &type="(get props type)" />`,
    ),
    {
      type: { utility: "get", parameters: ["props", "type"] },
      children: [],
      attributes: {},
      bindToProps: {},
    },
  );
});

Deno.test("&foreach with noop", () => {
  assertEquals(
    htmlispToBreezewind(
      `<noop &foreach="(get context blogPosts)">
        <div class="inline">
          <SiteLink
            &children="(get props data.title)"
            &href="(urlJoin blog (get props data.slug))"
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
    htmlispToBreezewind(`<noop><div>foo</div></noop>`),
    [{ type: "div", children: "foo", attributes: {} }],
  );
});

Deno.test("component with noop and siblings", () => {
  assertEquals(
    htmlispToBreezewind(`<noop><div>foo</div><div>bar</div></noop>`),
    [{ type: "div", children: "foo", attributes: {} }, {
      type: "div",
      children: "bar",
      attributes: {},
    }],
  );
});

Deno.test("noop with children", () => {
  assertEquals(
    htmlispToBreezewind(`<noop &children="(render (get props content))" />`),
    {
      children: {
        utility: "render",
        parameters: [{ utility: "get", parameters: ["props", "content"] }],
      },
      attributes: {},
    },
  );
});

Deno.test("nested noops", () => {
  assertEquals(
    htmlispToBreezewind(`<noop
      &visibleIf="(get props children)"
      &type="(concat h (get props level))"
      &id="(getUniqueAnchorId (get props children))"
      &class="(get props class)"
    >
      <noop &children="(render (get props children))" />
      <a
        &visibleIf="(invert (get props hideAnchor))"
        class="ml-2 no-underline text-sm align-middle mask-text-gray hover:mask-text-black"
        &href="(concat # (get props id))"
        >🔗</a
      >
    </noop>`),
    {
      visibleIf: { utility: "get", parameters: ["props", "children"] },
      type: {
        utility: "concat",
        parameters: ["h", { utility: "get", parameters: ["props", "level"] }],
      },
      bindToProps: {
        id: {
          utility: "getUniqueAnchorId",
          parameters: [{ utility: "get", parameters: ["props", "children"] }],
        },
        class: { utility: "get", parameters: ["props", "class"] },
      },
      attributes: {
        id: { utility: "get", parameters: ["props", "id"] },
        class: { utility: "get", parameters: ["props", "class"] },
      },
      children: [{
        attributes: {},
        children: {
          utility: "render",
          parameters: [{ utility: "get", parameters: ["props", "children"] }],
        },
      }, {
        type: "a",
        visibleIf: {
          utility: "invert",
          parameters: [{ utility: "get", parameters: ["props", "hideAnchor"] }],
        },
        bindToProps: {
          href: {
            utility: "concat",
            parameters: ["#", { utility: "get", parameters: ["props", "id"] }],
          },
        },
        attributes: {
          class:
            "ml-2 no-underline text-sm align-middle mask-text-gray hover:mask-text-black",
          href: { utility: "get", parameters: ["props", "href"] },
        },
        children: "🔗",
      }],
    },
  );
});
