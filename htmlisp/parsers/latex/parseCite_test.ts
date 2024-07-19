import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseCite } from "./parseCite.ts";
import { characterGenerator } from "../characterGenerator.ts";

Deno.test(`sentence with a citation`, () => {
  const sentence = String.raw`According to \cite{openWhatFirst}, the first.`;

  assertEquals(
    parseCite(characterGenerator(sentence)),
    // TODO
    [{
      type: "p",
      attributes: {},
      children: [sentence],
    }],
  );
});

Deno.test(`sentence with a textual citation`, () => {
  const sentence = String.raw`According to \citet{openWhatFirst}, the first.`;

  assertEquals(
    parseCite(characterGenerator(sentence)),
    // TODO
    [{
      type: "p",
      attributes: {},
      children: [sentence],
    }],
  );
});

Deno.test(`sentence with a parentheses citation`, () => {
  const sentence = String.raw`According to \citep{openWhatFirst}, the first.`;

  assertEquals(
    parseCite(characterGenerator(sentence)),
    // TODO
    [{
      type: "p",
      attributes: {},
      children: [sentence],
    }],
  );
});
