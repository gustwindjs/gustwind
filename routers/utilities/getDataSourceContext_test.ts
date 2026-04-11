import assert from "node:assert/strict";
import test from "node:test";
import { getDataSourceContext } from "./getDataSourceContext.ts";

test("converts empty data source ids to a context", async () => {
  assert.deepEqual(await getDataSourceContext({}, {}, {}), {});
});

test("converts a single data source id to a context", async () => {
  assert.deepEqual(
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

test("converts multiple data source ids to a context", async () => {
  assert.deepEqual(
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

test("converts a single data source id to a context with parameters", async () => {
  assert.deepEqual(
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

test("passes data from parent data sources to this", async () => {
  assert.deepEqual(
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
