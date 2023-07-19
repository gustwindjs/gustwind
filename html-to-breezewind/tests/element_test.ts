import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import htmlToBreezewind from "../index.ts";

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

Deno.test("element with a class list", () => {
  assertEquals(
    htmlToBreezewind(
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

// TODO: Test _foreach
