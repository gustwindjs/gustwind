import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseRef } from "./parseRef.ts";
import { characterGenerator } from "../characterGenerator.ts";

Deno.test(`ref`, () => {
  const sentence = String.raw`hello world at \ref{ch:foo}`;

  assertEquals(
    parseRef(characterGenerator(sentence)),
    // TODO
    [{
      type: "p",
      attributes: {},
      children: [sentence],
    }],
  );
});

Deno.test(`nameref`, () => {
  const sentence = String.raw`hello world at \nameref{ch:foo}`;

  assertEquals(
    parseRef(characterGenerator(sentence)),
    // TODO
    [{
      type: "p",
      attributes: {},
      children: [sentence],
    }],
  );
});

Deno.test(`autoref`, () => {
  const sentence = String.raw`hello world at \autoref{ch:foo}`;

  assertEquals(
    parseRef(characterGenerator(sentence)),
    // TODO
    [{
      type: "p",
      attributes: {},
      children: [sentence],
    }],
  );
});
