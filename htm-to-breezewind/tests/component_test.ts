import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmToBreezewind } from "../mod.ts";

Deno.test("basic component", () => {
  assertEquals(
    htmToBreezewind(`<Button>foo</Button>`),
    {
      type: "Button",
      children: "foo",
      attributes: {},
    },
  );
});

Deno.test("component with attributes", () => {
  assertEquals(
    htmToBreezewind(`<Button title="demo">foo</Button>`),
    {
      type: "Button",
      children: "foo",
      attributes: { title: "demo" },
    },
  );
});

Deno.test("component with children", () => {
  assertEquals(
    htmToBreezewind(`<Button><div>foo</div></Button>`),
    {
      type: "Button",
      children: [{ type: "div", children: "foo", attributes: {} }],
      attributes: {},
    },
  );
});

Deno.test("component with multiple children", () => {
  assertEquals(
    htmToBreezewind(`<Button><div>foo</div><div>bar</div></Button>`),
    {
      type: "Button",
      children: [
        { type: "div", children: "foo", attributes: {} },
        { type: "div", children: "bar", attributes: {} },
      ],
      attributes: {},
    },
  );
});

Deno.test("component with noop", () => {
  assertEquals(
    htmToBreezewind(`<noop><div>foo</div></noop>`),
    [{ type: "div", children: "foo", attributes: {} }],
  );
});

Deno.test("component with noop and siblings", () => {
  assertEquals(
    htmToBreezewind(`<noop><div>foo</div><div>bar</div></noop>`),
    [{ type: "div", children: "foo", attributes: {} }, {
      type: "div",
      children: "bar",
      attributes: {},
    }],
  );
});
