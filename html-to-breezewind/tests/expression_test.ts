import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlToBreezewind } from "../mod.ts";

Deno.test("element with an expression shortcut for attribute", () => {
  assertEquals(
    htmlToBreezewind(
      `<a &href="(get props href)" />`,
    ),
    {
      type: "a",
      attributes: { href: { utility: "get", parameters: ["props", "href"] } },
      children: [],
    },
  );
});

Deno.test("element with an expression and multiple parameters", () => {
  assertEquals(
    htmlToBreezewind(
      `<a &href="(echo hello ' ' world!)" />`,
    ),
    {
      type: "a",
      attributes: {
        href: { utility: "echo", parameters: ["hello", " ", "world!"] },
      },
      children: [],
    },
  );
});

Deno.test("element with a nested expression shortcut for attribute", () => {
  assertEquals(
    htmlToBreezewind(
      `<a &href="(concat / (get props href))" />`,
    ),
    {
      type: "a",
      attributes: {
        href: {
          utility: "concat",
          parameters: ["/", { utility: "get", parameters: ["props", "href"] }],
        },
      },
      children: [],
    },
  );
});

Deno.test("element with an expression shortcut for children", () => {
  assertEquals(
    htmlToBreezewind(
      `<div &children="(get props href)" />`,
    ),
    {
      type: "div",
      children: { utility: "get", parameters: ["props", "href"] },
      attributes: {},
    },
  );
});

Deno.test("element with a nested expression shortcut for children", () => {
  assertEquals(
    htmlToBreezewind(
      `<div &children="(concat / (get props href))" />`,
    ),
    {
      type: "div",
      children: {
        utility: "concat",
        parameters: ["/", { utility: "get", parameters: ["props", "href"] }],
      },
      attributes: {},
    },
  );
});

Deno.test("element with a complex nested expression shortcut for children", () => {
  assertEquals(
    htmlToBreezewind(
      `<div &children="(concat / (get props href) /)" />`,
    ),
    {
      type: "div",
      children: {
        utility: "concat",
        parameters: [
          "/",
          { utility: "get", parameters: ["props", "href"] },
          "/",
        ],
      },
      attributes: {},
    },
  );
});

Deno.test("element with a type expression for noop type", () => {
  assertEquals(
    htmlToBreezewind(
      `<noop &type="(get props type)" />`,
    ),
    {
      type: { utility: "get", parameters: ["props", "type"] },
      children: [],
      attributes: {},
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
