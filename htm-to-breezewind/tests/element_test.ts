import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmToBreezewind } from "../mod.ts";

Deno.test("basic element", () => {
  assertEquals(
    htmToBreezewind(`<div>foo</div>`),
    {
      type: "div",
      children: "foo",
      attributes: {},
    },
  );
});

Deno.test("nested element", () => {
  assertEquals(
    htmToBreezewind(`<div><span>foo</span></div>`),
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
    htmToBreezewind(`<div title="bar">foo</div>`),
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
    htmToBreezewind(
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
    htmToBreezewind(
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
    htmToBreezewind(
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
    htmToBreezewind(`<div class="bar">foo</div>`),
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
    htmToBreezewind(
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
    htmToBreezewind(
      `<div _classlist="{ 'font-bold': [{ 'utility': 'get', 'parameters': ['props', 'href'] }] }">foo</div>`,
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

Deno.test("props through slots as elements", () => {
  assertEquals(
    htmToBreezewind(
      `<BaseLayout>
        <Slot name="content">
          <div>hello</div>
        </Slot>
      </BaseLayout>
    `,
    ),
    {
      type: "BaseLayout",
      attributes: {},
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

// TODO: Test _foreach
// TODO: Test _foreach with Noop
