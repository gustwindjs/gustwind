import assert from "node:assert/strict";
import test from "node:test";
import { htmlispToHTML } from "../mod.ts";

test("component with render", async () => {
  assert.deepEqual(
    await htmlispToHTML({
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

test("component with undefined render", async () => {
  assert.deepEqual(
    await htmlispToHTML({
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

test("render within a component", async () => {
  assert.deepEqual(
    await htmlispToHTML({
      htmlInput: `<SiteLink href="test">Foobar</SiteLink>`,
      components: {
        SiteLink:
          `<a &href="(get props href)" &children="(render (get props children))"></a>`,
      },
    }),
    `<a href="test">Foobar</a>`,
  );
});

test("render within a component 2", async () => {
  assert.deepEqual(
    await htmlispToHTML({
      htmlInput: `<SiteLink href="test">foobar</SiteLink>`,
      components: {
        SiteLink:
          `<a &href="(get props href)" &children="(render (get props children))"></a>`,
      },
    }),
    `<a href="test">foobar</a>`,
  );
});
