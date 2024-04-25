import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTMLSync } from "../mod.ts";

Deno.test("component with render", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<div &children="(render (get context button))"></div>`,
      components: {
        Button: '<button &children="(get props children)"></button>',
      },
      context: {
        button: '<Button children="demo" />',
      },
    }),
    `<div><button>demo</button></div>`,
  );
});

Deno.test("component with undefined render", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<div &children="(render (get context button))"></div>`,
      components: {
        Button: "<div></div>",
      },
      context: {
        button: undefined,
      },
    }),
    `<div></div>`,
  );
});

Deno.test("render within a component", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<SiteLink href="test">Foobar</SiteLink>`,
      components: {
        SiteLink:
          `<a &href="(get props href)" &children="(render (get props children))"></a>`,
      },
    }),
    `<a href="test">Foobar</a>`,
  );
});

Deno.test("render within a component 2", async () => {
  assertEquals(
    await htmlispToHTMLSync({
      htmlInput: `<SiteLink href="test">foobar</SiteLink>`,
      components: {
        SiteLink:
          `<a &href="(get props href)" &children="(render (get props children))"></a>`,
      },
    }),
    `<a href="test">foobar</a>`,
  );
});
