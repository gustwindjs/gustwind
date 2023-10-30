import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlToBreezewind } from "../mod.ts";

Deno.test("basic element", () => {
  assertEquals(
    htmlToBreezewind(`<div>foo</div>`),
    {
      type: "div",
      children: "foo",
      attributes: {},
    },
  );
});

Deno.test("nested element", () => {
  assertEquals(
    htmlToBreezewind(`<div><span>foo</span></div>`),
    {
      type: "div",
      children: [
        {
          type: "span",
          children: "foo",
          attributes: {},
        },
      ],
      attributes: {},
    },
  );
});

Deno.test("element with an attribute", () => {
  assertEquals(
    htmlToBreezewind(`<div title="bar">foo</div>`),
    {
      type: "div",
      children: "foo",
      attributes: {
        title: "bar",
      },
    },
  );
});

Deno.test("element with a children attribute", () => {
  assertEquals(
    htmlToBreezewind(
      `<div _children="{ 'utility': 'get', 'parameters': ['props', 'href'] }"/>`,
    ),
    {
      type: "div",
      children: { utility: "get", parameters: ["props", "href"] },
      attributes: {},
    },
  );
});

Deno.test("element with a children attribute 2", () => {
  assertEquals(
    htmlToBreezewind(
      `<div
        class="md:mx-auto my-8 px-4 md:px-0 w-full lg:max-w-3xl prose lg:prose-xl"
        _children="{ 'utility': 'get', 'parameters': ['context', 'readme.content'] }"
      ></div>`,
    ),
    {
      type: "div",
      attributes: {
        class:
          "md:mx-auto my-8 px-4 md:px-0 w-full lg:max-w-3xl prose lg:prose-xl",
      },
      children: {
        utility: "get",
        parameters: ["context", "readme.content"],
      },
    },
  );
});

Deno.test("element with a transformed attribute", () => {
  assertEquals(
    htmlToBreezewind(
      `<a _href="{ 'utility': 'get', 'parameters': ['props', 'href'] }">foo</a>`,
    ),
    {
      type: "a",
      children: "foo",
      attributes: {
        href: { utility: "get", parameters: ["props", "href"] },
      },
    },
  );
});

Deno.test("element with a class", () => {
  assertEquals(
    htmlToBreezewind(`<div class="bar">foo</div>`),
    {
      type: "div",
      children: "foo",
      // Instead of using the class shortcut, map to an attribute directly as it is the same
      attributes: {
        class: "bar",
      },
    },
  );
});

Deno.test("element with a comment", () => {
  assertEquals(
    htmlToBreezewind(
      `<div __reference="https://kevincox.ca/2022/05/06/rss-feed-best-practices/">foo</div>`,
    ),
    {
      type: "div",
      children: "foo",
      attributes: {},
    },
  );
});

Deno.test("element with a class list", () => {
  assertEquals(
    htmlToBreezewind(
      `<div _classList="{ 'font-bold': [{ 'utility': 'get', 'parameters': ['props', 'href'] }] }">foo</div>`,
    ),
    {
      type: "div",
      children: "foo",
      classList: {
        "font-bold": [{ "utility": "get", "parameters": ["props", "href"] }],
      },
      attributes: {},
    },
  );
});

Deno.test("element with a class and a class list", () => {
  assertEquals(
    htmlToBreezewind(
      `<div class="underline" _classList="{ 'font-bold': [{ 'utility': 'get', 'parameters': ['props', 'href'] }] }">foo</div>`,
    ),
    {
      type: "div",
      children: "foo",
      attributes: {
        class: "underline",
      },
      classList: {
        "font-bold": [{ "utility": "get", "parameters": ["props", "href"] }],
      },
    },
  );
});

Deno.test("element with a visibleIf", () => {
  assertEquals(
    htmlToBreezewind(
      `<div _visibleIf="[{ 'utility': 'get', 'parameters': ['props', 'showToc'] }]">foo</div>`,
    ),
    {
      type: "div",
      children: "foo",
      visibleIf: [{ utility: "get", parameters: ["props", "showToc"] }],
      attributes: {},
    },
  );
});

Deno.test("props through slots as elements", () => {
  assertEquals(
    htmlToBreezewind(
      `<BaseLayout>
        <slot name="content">
          <div>hello</div>
        </slot>
      </BaseLayout>
    `,
    ),
    {
      type: "BaseLayout",
      props: {
        content: [
          {
            type: "div",
            attributes: {},
            children: "hello",
          },
        ],
      },
    },
  );
});

Deno.test("_foreach", () => {
  assertEquals(
    htmlToBreezewind(
      `<ul
        _foreach="{ 'utility': 'get', 'parameters': ['context', 'blogPosts'] }"
      >
        <li class="inline">
          <SiteLink
            #children="{ 'utility': 'get', 'parameters': ['props', 'data.title'] }"
            #href="{ 'utility': 'concat', 'parameters': ['blog/', { 'utility': 'get', 'parameters': ['props', 'data.slug'] }] }"
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
                utility: "concat",
                parameters: [
                  "blog/",
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

Deno.test("_foreach with noop", () => {
  assertEquals(
    htmlToBreezewind(
      `<noop
        _foreach="{ 'utility': 'get', 'parameters': ['context', 'blogPosts'] }"
      >
        <div class="inline">
          <SiteLink
            #children="{ 'utility': 'get', 'parameters': ['props', 'data.title'] }"
            #href="{ 'utility': 'concat', 'parameters': ['blog/', { 'utility': 'get', 'parameters': ['props', 'data.slug'] }] }"
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
                utility: "concat",
                parameters: [
                  "blog/",
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

// TODO: Test #type

/*
TODO: Support attribute helpers for complex expressions?

<a
  x-attr
  x="state.value.textContent"
  @href="state.value.parentElement?.attributes.href?.value"
  _@class="{
    'utility': 'concat',
    'parameters': [
      '[state.value.textContent === parent.closest.textContent && \'',
      { 'utility': 'tw', 'parameters': ['underline'] },
      '\', state.tagName === 'H3' && \'',
      { 'utility': 'tw', 'parameters': ['ml-2'] },
      \']'
    ]
  }"
>
  <attribute name="@class">
    <utility name="concat">
      <parameter
        >[state.value.textContent === parent.closest.textContent &&
        '<utility name="tw"><parameter>underline</parameter></utility
        >'</parameter
      >
      <parameter
        >state.tagName === 'H3' && '<utility name="tw"
          ><parameter>ml-2</parameter></utility
        >'</parameter
      >
    </utility>
  </attribute>
</a>
*/
