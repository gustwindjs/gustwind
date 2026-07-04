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

test("converts array-shaped data source ids to a context", async () => {
  assert.deepEqual(
    await getDataSourceContext(
      {},
      [{ name: "demo", operation: "processInput", parameters: ["foobar"] }],
      { processInput: (input: string) => input.toUpperCase() },
    ),
    {
      demo: "FOOBAR",
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

test("memoizes identical data source calls within a provided cache", async () => {
  let callCount = 0;
  const calls: { cacheHit: boolean; operation: string }[] = [];
  const context = await getDataSourceContext(
    {},
    {
      first: { operation: "processInput", parameters: ["foo"] },
      second: { operation: "processInput", parameters: ["foo"] },
    },
    {
      async processInput(input: string) {
        callCount++;
        return input.toUpperCase();
      },
    },
    Number.POSITIVE_INFINITY,
    {
      dataSourceCache: new Map(),
      recordDataSourceCall(result) {
        calls.push({
          cacheHit: result.cacheHit,
          operation: result.operation,
        });
      },
    },
  );

  assert.equal(callCount, 1);
  assert.deepEqual(context, {
    first: "FOO",
    second: "FOO",
  });
  assert.deepEqual(
    calls.map(({ cacheHit }) => cacheHit).sort(),
    [false, true],
  );
});
