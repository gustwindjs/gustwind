import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import htmlToBreezewind from "../index.ts";

Deno.test("basic component", () => {
  assertEquals(
    htmlToBreezewind(`<Button>foo</Button>`),
    {
      type: "Button",
      children: "foo",
      attributes: {},
    },
  );
});

Deno.test("component with attributes", () => {
  assertEquals(
    htmlToBreezewind(`<Button title="demo">foo</Button>`),
    {
      type: "Button",
      children: "foo",
      attributes: { title: "demo" },
    },
  );
});

Deno.test("component with children", () => {
  assertEquals(
    htmlToBreezewind(`<Button><div>foo</div></Button>`),
    {
      type: "Button",
      children: [{ type: "div", children: "foo", attributes: {} }],
      attributes: {},
    },
  );
});

Deno.test("component with multiple children", () => {
  assertEquals(
    htmlToBreezewind(`<Button><div>foo</div><div>bar</div></Button>`),
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
    htmlToBreezewind(`<Noop><div>foo</div></Noop>`),
    [{ type: "div", children: "foo", attributes: {} }],
  );
});

Deno.test("component with noop and siblings", () => {
  assertEquals(
    htmlToBreezewind(`<Noop><div>foo</div><div>bar</div></Noop>`),
    [{ type: "div", children: "foo", attributes: {} }, {
      type: "div",
      children: "bar",
      attributes: {},
    }],
  );
});
