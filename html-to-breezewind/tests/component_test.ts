import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlToBreezewind } from "../mod.ts";

Deno.test("basic component", () => {
  assertEquals(
    htmlToBreezewind(`<Button>foo</Button>`),
    {
      type: "Button",
      children: "foo",
      props: {},
    },
  );
});

Deno.test("component with attributes", () => {
  assertEquals(
    htmlToBreezewind(`<Button title="demo">foo</Button>`),
    {
      type: "Button",
      children: "foo",
      props: { title: "demo" },
    },
  );
});

Deno.test("component with children", () => {
  assertEquals(
    htmlToBreezewind(`<Button><div>foo</div></Button>`),
    {
      type: "Button",
      children: [{ type: "div", children: "foo", attributes: {} }],
      props: {},
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
      props: {},
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

Deno.test("component with noop and utilities", () => {
  assertEquals(
    htmlToBreezewind(`<noop
      _type="{ 'utility': 'get', 'parameters': ['props', 'type'] }"
      _class="{ 'utility': 'get', 'parameters': ['props', 'class'] }"
      _children="{
        'utility': 'processMarkdown',
        'parameters': [{ 'utility': 'get', 'parameters': ['props', 'inputText'] }]
      }"
    ></noop>`),
    {
      type: { "utility": "get", "parameters": ["props", "type"] },
      attributes: {
        class: { "utility": "get", "parameters": ["props", "class"] },
      },
      children: {
        "utility": "processMarkdown",
        "parameters": [{
          "utility": "get",
          "parameters": ["props", "inputText"],
        }],
      },
    },
  );
});

Deno.test("component with local binding", () => {
  assertEquals(
    htmlToBreezewind(`<Markdown
      type="div"
      #inputText="{ 'utility': 'get', 'parameters': ['context', 'document.content'] }"
    ></Markdown>`),
    {
      type: "Markdown",
      props: { type: "div" },
      children: [],
      bindToProps: {
        inputText: {
          utility: "get",
          parameters: ["context", "document.content"],
        },
      },
    },
  );
});

Deno.test("component with children and local binding", () => {
  assertEquals(
    htmlToBreezewind(`<Markdown
      type="div"
      #children="{ 'utility': 'get', 'parameters': ['context', 'document.content'] }"
    ></Markdown>`),
    {
      type: "Markdown",
      props: { type: "div" },
      children: [],
      bindToProps: {
        children: {
          utility: "get",
          parameters: ["context", "document.content"],
        },
      },
    },
  );
});
