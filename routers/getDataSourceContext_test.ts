import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { getDataSourceContext } from "./getDataSourceContext.ts";

Deno.test("converts empty data source ids to a context", async () => {
  assertEquals(await getDataSourceContext([], {}), {});
});

Deno.test("converts a single data source id to a context", async () => {
  assertEquals(
    await getDataSourceContext(
      [{ operation: "processInput", name: "demo" }],
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
      [{ operation: "processInput", name: "demo" }, {
        operation: "processInput",
        name: "another",
      }],
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
      [{ operation: "processInput", name: "demo", parameters: ["foobar"] }],
      { processInput: (input: string) => "foobar" + input },
    ),
    {
      demo: "foobarfoobar",
    },
  );
});
