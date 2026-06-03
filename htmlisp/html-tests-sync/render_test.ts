import assert from "node:assert/strict";
import test from "node:test";
import { htmlispToHTMLSync } from "../mod.ts";

test("component with render", async () => {
  assert.deepEqual(
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

test("component with undefined render", async () => {
  assert.deepEqual(
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

test("renderRaw treats already-rendered HTML as opaque", async () => {
  assert.deepEqual(
    await htmlispToHTMLSync({
      htmlInput: `<main &children="(renderRaw (get context content))"></main>`,
      context: {
        content: "<Suspense>Ready</Suspense><p>less than <1kb</p>",
      },
    }),
    `<main><Suspense>Ready</Suspense><p>less than <1kb</p></main>`,
  );
});

test("render within a component", async () => {
  assert.deepEqual(
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

test("render within a component 2", async () => {
  assert.deepEqual(
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
