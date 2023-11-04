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

Deno.test("doctype", () => {
  assertEquals(
    htmlToBreezewind("<!DOCTYPE html>"),
    [{
      type: "!DOCTYPE",
      attributes: {
        html: true,
      },
      closingCharacter: "",
    }],
  );
});

Deno.test("doctype and content", () => {
  assertEquals(
    htmlToBreezewind(`<!DOCTYPE html>
    <div>hello</div>`),
    [{
      type: "!DOCTYPE",
      attributes: {
        html: true,
      },
      closingCharacter: "",
    }, {
      type: "div",
      attributes: {},
      children: "hello",
    }],
  );
});

Deno.test("xml", () => {
  assertEquals(
    htmlToBreezewind('<?xml version="1.0" encoding="utf-8" ?>'),
    [{
      type: "?xml",
      attributes: {
        version: "1.0",
        encoding: "utf-8",
      },
      closingCharacter: "?",
    }],
  );
});
