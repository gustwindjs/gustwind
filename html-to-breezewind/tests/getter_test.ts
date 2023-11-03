import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlToBreezewind } from "../mod.ts";

Deno.test("element with a getter shortcut for children", () => {
  assertEquals(
    htmlToBreezewind(
      `<div &children="props.href"/>`,
    ),
    {
      type: "div",
      children: { utility: "get", parameters: ["props", "href"] },
      attributes: {},
    },
  );
});

Deno.test("element with a getter shortcut for noop type", () => {
  assertEquals(
    htmlToBreezewind(
      `<noop &type="props.type" />`,
    ),
    {
      type: { utility: "get", parameters: ["props", "type"] },
      children: [],
      attributes: {},
    },
  );
});

Deno.test("element with a complex getter shortcut for noop type", () => {
  assertEquals(
    htmlToBreezewind(
      `<noop
      &type="props.type"
      &class="props.class"
      &children="props.children"
    ></noop>`,
    ),
    {
      type: { utility: "get", parameters: ["props", "type"] },
      attributes: {
        class: { utility: "get", parameters: ["props", "class"] },
      },
      children: { utility: "get", parameters: ["props", "children"] },
    },
  );
});

Deno.test("element with a getter shortcut for children with a complex key", () => {
  assertEquals(
    htmlToBreezewind(
      `<div &children="context.meta.href"/>`,
    ),
    {
      type: "div",
      children: { utility: "get", parameters: ["context", "meta.href"] },
      attributes: {},
    },
  );
});

Deno.test("element with a getter shortcut with a complex key", () => {
  assertEquals(
    htmlToBreezewind(
      `<a &href="context.meta.href">foo</a>`,
    ),
    {
      type: "a",
      children: "foo",
      attributes: {
        href: { utility: "get", parameters: ["context", "meta.href"] },
      },
    },
  );
});

Deno.test("element with a getter shortcut for attributes", () => {
  assertEquals(
    htmlToBreezewind(
      `<a &href="props.href">foo</a>`,
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

Deno.test("component with a getter shortcut with a complex key", () => {
  assertEquals(
    htmlToBreezewind(
      `<Link &href="context.meta.href">foo</Link>`,
    ),
    {
      type: "Link",
      children: "foo",
      props: {
        href: { utility: "get", parameters: ["context", "meta.href"] },
      },
    },
  );
});

// TODO: Support this case
/*
Deno.test("component with a getter shortcut for children with a complex key", () => {
  assertEquals(
    htmlToBreezewind(
      `<Link &children="context.meta.href" />`,
    ),
    {
      type: "Link",
      children: { utility: "get", parameters: ["context", "meta.href"] },
      attributes: {},
    },
  );
});
*/
