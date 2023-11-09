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

Deno.test("component with an expression", () => {
  assertEquals(
    htmlToBreezewind(
      `<Link
        &href="(get context document.content)"
      ></Link>`,
    ),
    {
      type: "Link",
      children: [],
      bindToProps: {
        href: {
          utility: "get",
          parameters: ["context", "document.content"],
        },
      },
      props: {},
    },
  );
});

Deno.test("component with a children expression", () => {
  assertEquals(
    htmlToBreezewind(
      `<Markdown
        type="as"
        &children="(get context document.content)"
      ></Markdown>`,
    ),
    {
      type: "Markdown",
      children: [],
      props: {
        as: "div",
      },
      bindToProps: {
        children: {
          utility: "get",
          parameters: ["context", "document.content"],
        },
      },
    },
  );
});

Deno.test("component with a children expression 2", () => {
  assertEquals(
    htmlToBreezewind(
      `<Heading level="2" class="text-4xl" &children="(get props name)" />`,
    ),
    {
      type: "Heading",
      children: [],
      props: {
        class: "text-4xl",
        level: "2",
      },
      bindToProps: {
        children: {
          utility: "get",
          parameters: ["props", "name"],
        },
      },
    },
  );
});
