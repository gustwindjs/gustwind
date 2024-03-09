import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToBreezewind } from "../mod.ts";

Deno.test("basic component", () => {
  assertEquals(
    htmlispToBreezewind(`<Button>foo</Button>`),
    {
      type: "Button",
      children: "foo",
      props: {},
    },
  );
});

Deno.test("component with attributes", () => {
  assertEquals(
    htmlispToBreezewind(`<Button title="demo">foo</Button>`),
    {
      type: "Button",
      children: "foo",
      props: { title: "demo" },
    },
  );
});

Deno.test("component with children", () => {
  assertEquals(
    htmlispToBreezewind(`<Button><div>foo</div></Button>`),
    {
      type: "Button",
      children: [{ type: "div", children: "foo", attributes: {} }],
      props: {},
    },
  );
});

Deno.test("component with multiple children", () => {
  assertEquals(
    htmlispToBreezewind(`<Button><div>foo</div><div>bar</div></Button>`),
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
    htmlispToBreezewind(
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
    htmlispToBreezewind(
      `<Markdown
        type="div"
        &children="(get context document.content)"
      ></Markdown>`,
    ),
    {
      type: "Markdown",
      children: [],
      props: {
        type: "div",
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
    htmlispToBreezewind(
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
