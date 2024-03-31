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
        BaseLayout: `<div><main &children="(get props content)" /></div>`,
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
        BaseLayout:
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
        BaseLayout:
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
        BaseLayout: `<div><main &children="(get props content)" /></div>`,
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
        BaseLayout: `<div><main &children="(get props content)" /></div>`,
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
        BaseLayout: `<div><main &children="(get props content)" /></div>`,
        Workshops: `<div &children="(get props children)"></div>`,
      },
      context: {
        workshops: "demo",
      },
    }),
    `<div><main><div>demo</div></main></div>`,
  );
});

Deno.test("components through slots", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<BaseLayout>
        <slot name="content">
          <SiteLink href="modes">Modes</SiteLink>
        </slot>
      </BaseLayout>
    `,
      components: {
        BaseLayout: `<div><main &children="(get props content)" /></div>`,
        SiteLink:
          '<a &href="(get props href)" &children="(get props children)"></a>',
      },
    }),
    `<div><main><a href="modes">Modes</a></main></div>`,
  );
});

Deno.test("complex components through slots", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<BaseLayout>
        <slot name="content">
          <Navigation />
        </slot>
      </BaseLayout>
    `,
      components: {
        BaseLayout: `<div><main &children="(get props content)" /></div>`,
        Navigation: '<SiteLink href="modes">Modes</SiteLink>',
        SiteLink:
          '<a &href="(get props href)" &children="(get props children)"></a>',
      },
    }),
    `<div><main><a href="modes">Modes</a></main></div>`,
  );
});

Deno.test("complex components containing siblings within elements through slots", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<BaseLayout>
        <slot name="content">
          <div>
            <Navigation />
          </div>
        </slot>
      </BaseLayout>
    `,
      components: {
        BaseLayout: `<div><main &children="(get props content)" /></div>`,
        Navigation:
          '<SiteLink href="modes">Modes</SiteLink><SiteLink href="documentation">Documentation</SiteLink>',
        SiteLink:
          '<a &href="(get props href)" &children="(get props children)"></a>',
      },
    }),
    `<div><main><div><a href="modes">Modes</a><a href="documentation">Documentation</a></div></main></div>`,
  );
});
