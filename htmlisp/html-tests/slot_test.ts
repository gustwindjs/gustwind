import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("props through slots as elements", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<BaseLayout>
        <slot name="content">
          <div>hello</div>
        </slot>
      </BaseLayout>
    `,
      components: {
        BaseComponent: `<div><main &children="(get props content)" /></div>`,
      },
    }),
    "<div><main><div>hello</div></main></div>",
  );
});

Deno.test("props through slots as elements including normal props", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<BaseLayout title="demo">
        <slot name="content">
          <div>hello</div>
        </slot>
      </BaseLayout>
    `,
      components: {
        BaseComponent:
          `<div &title="(get props title)"><main &children="(get props content)" /></div>`,
      },
    }),
    `<div title="demo"><main><div>hello</div></main></div>`,
  );
});

Deno.test("props through slots as elements including bound props", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<BaseLayout &title="(get context title)">
        <slot name="content">
          <div>hello</div>
        </slot>
      </BaseLayout>
    `,
      components: {
        BaseComponent:
          `<div &title="(get props title)"><main &children="(get props content)" /></div>`,
      },
      context: {
        title: "demo",
      },
    }),
    `<div title="demo"><main><div>hello</div></main></div>`,
  );
});

Deno.test("children binding within slots", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<BaseLayout>
        <slot name="content">
          <span &children="(get context title)"></span>
        </slot>
      </BaseLayout>
    `,
      components: {
        BaseComponent: `<div><main &children="(get props content)" /></div>`,
      },
      context: {
        title: "demo",
      },
    }),
    `<div><main><span>demo</span></main></div>`,
  );
});

Deno.test("attribute binding within slots", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<BaseLayout>
        <slot name="content">
          <div &title="(get context title)"></div>
        </slot>
      </BaseLayout>
    `,
      components: {
        BaseComponent: `<div><main &children="(get props content)" /></div>`,
      },
      context: {
        title: "demo",
      },
    }),
    `<div><main><div title="demo"></div></main></div>`,
  );
});

Deno.test("attribute binding to children within slots", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<BaseLayout>
        <slot name="content">
          <Workshops &children="(get context workshops)" />
        </slot>
      </BaseLayout>
    `,
      components: {
        BaseComponent: `<div><main &children="(get props content)" /></div>`,
        Workshops: `<div &children="(get props children)"></div>`,
      },
      context: {
        workshops: "demo",
      },
    }),
    `<div><main><div>demo</div></main></div>`,
  );
});
