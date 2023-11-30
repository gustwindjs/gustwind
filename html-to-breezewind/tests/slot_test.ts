import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlToBreezewind } from "../mod.ts";

Deno.test("props through slots as elements", () => {
  assertEquals(
    htmlToBreezewind(
      `<BaseLayout>
        <slot name="content">
          <div>hello</div>
        </slot>
      </BaseLayout>
    `,
    ),
    {
      type: "BaseLayout",
      props: {
        content: [
          {
            type: "div",
            attributes: {},
            children: "hello",
          },
        ],
      },
    },
  );
});

Deno.test("props through slots as elements including normal props", () => {
  assertEquals(
    htmlToBreezewind(
      `<BaseLayout title="demo">
        <slot name="content">
          <div>hello</div>
        </slot>
      </BaseLayout>
    `,
    ),
    {
      type: "BaseLayout",
      props: {
        title: "demo",
        content: [
          {
            type: "div",
            attributes: {},
            children: "hello",
          },
        ],
      },
    },
  );
});

Deno.test("props through slots as elements including bound props", () => {
  assertEquals(
    htmlToBreezewind(
      `<BaseLayout &title="(get props title)">
        <slot name="content">
          <div>hello</div>
        </slot>
      </BaseLayout>
    `,
    ),
    {
      type: "BaseLayout",
      props: {
        content: [
          {
            type: "div",
            attributes: {},
            children: "hello",
          },
        ],
      },
      bindToProps: {
        title: {
          utility: "get",
          parameters: ["props", "title"],
        },
      },
    },
  );
});

Deno.test("children binding within slots", () => {
  assertEquals(
    htmlToBreezewind(
      `<BaseLayout>
        <slot name="content">
          <span &children="(get props day)"></span>
        </slot>
      </BaseLayout>
    `,
    ),
    {
      type: "BaseLayout",
      props: {
        content: [
          {
            type: "span",
            attributes: {},
            // TODO: This should go to bindToProps instead
            children: { utility: "get", parameters: ["props", "day"] },
          },
        ],
      },
    },
  );
});

Deno.test("attribute binding within slots", () => {
  assertEquals(
    htmlToBreezewind(
      `<BaseLayout>
        <slot name="content">
          <div &title="(get props day)"></div>
        </slot>
      </BaseLayout>
    `,
    ),
    {
      type: "BaseLayout",
      props: {
        content: [
          {
            type: "div",
            // TODO: This should go to bindToProps instead
            attributes: {
              title: {
                parameters: ["props", "day"],
                utility: "get",
              },
            },
            children: [],
          },
        ],
      },
    },
  );
});
