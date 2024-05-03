import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { getDataSourceContext } from "./getDataSourceContext.ts";

Deno.test("converts empty data source ids to a context", async () => {
  assertEquals(await getDataSourceContext({}, {}, {}), {});
});

Deno.test("converts a single data source id to a context", async () => {
  assertEquals(
    await getDataSourceContext(
      {},
      { demo: { operation: "processInput" } },
      { processInput: () => "foobar" },
    ),
    {
      demo: "foobar",
    },
  );
});

Deno.test("converts multiple data source ids to a context", async () => {
  assertEquals(
    await getDataSourceContext(
      {},
      {
        demo: { operation: "processInput" },
        another: { operation: "processInput" },
      },
      { processInput: () => "foobar" },
    ),
    {
      demo: "foobar",
      another: "foobar",
    },
  );
});

Deno.test("converts a single data source id to a context with parameters", async () => {
  assertEquals(
    await getDataSourceContext(
      {},
      { demo: { operation: "processInput", parameters: ["foobar"] } },
      { processInput: (input: string) => "foobar" + input },
    ),
    {
      demo: "foobarfoobar",
    },
  );
});

Deno.test("passes data from parent data sources to this", async () => {
  assertEquals(
    await getDataSourceContext(
      { foo: "bar" },
      { demo: { operation: "processInput" } },
      {
        processInput: function () {
          // @ts-expect-error This is fine
          return this.parentDataSources.foo;
        },
      },
    ),
    {
      demo: "bar",
    },
  );
});
