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

Deno.test("element with a nested expression shortcut for attribute", () => {
  assertEquals(
    htmlToBreezewind(
      `<a &href="(concat '/' (get props href))" />`,
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
      `<div &children="(concat '/' (get props href))" />`,
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
      `<div &children="(concat '/' (get props href) '/')" />`,
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
