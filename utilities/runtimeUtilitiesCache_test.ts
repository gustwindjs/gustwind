import assert from "node:assert/strict";
import test from "node:test";
import { createRuntimeUtilitiesResolver } from "./runtimeUtilitiesCache.ts";

test("runtime utilities resolver reuses initialized utilities for the same route runtime", () => {
  let globalUtilityInitCount = 0;
  let componentUtilityInitCount = 0;
  const matchRoute = async () => undefined;
  const resolveRuntimeUtilities = createRuntimeUtilitiesResolver({
    load: {
      async dir() {
        return [];
      },
      async json() {
        throw new Error("json should not be called");
      },
      async module() {
        throw new Error("module should not be called");
      },
      async textFile() {
        throw new Error("textFile should not be called");
      },
      textFileSync() {
        throw new Error("textFileSync should not be called");
      },
    },
    render: async () => "",
    renderSync: () => "",
  });

  const sharedOptions = {
    componentUtilities: {
      Box: {
        init: () => {
          componentUtilityInitCount++;
          return {};
        },
      },
    },
    globalUtilities: {
      init: () => {
        globalUtilityInitCount++;
        return {};
      },
    },
    matchRoute,
  };

  const firstUtilities = resolveRuntimeUtilities({
    ...sharedOptions,
    url: "",
  });
  const secondUtilities = resolveRuntimeUtilities({
    ...sharedOptions,
    url: "",
  });
  const thirdUtilities = resolveRuntimeUtilities({
    ...sharedOptions,
    url: "/docs/",
  });

  assert.equal(firstUtilities, secondUtilities);
  assert.notEqual(firstUtilities, thirdUtilities);
  assert.equal(globalUtilityInitCount, 2);
  assert.equal(componentUtilityInitCount, 2);
});
