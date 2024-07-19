import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseFootnote } from "./parseFootnote.ts";
import { characterGenerator } from "../characterGenerator.ts";

Deno.test(`footnote`, () => {
  const sentence = String.raw`\footnote{and hello again}`;

  assertEquals(
    parseFootnote(characterGenerator(sentence)),
    // TODO
    [{
      type: "p",
      attributes: {},
      children: [sentence],
    }],
  );
});

Deno.test(`simple link in footnote`, () => {
  const sentence = String
    .raw`\footnote{and hello again \url{https://google.com}}`;

  assertEquals(
    parseFootnote(characterGenerator(sentence)),
    // TODO
    [{
      type: "p",
      attributes: {},
      children: [sentence],
    }],
  );
});

Deno.test(`complex link in footnote`, () => {
  const sentence = String
    .raw`\footnote{and hello again \href{https://google.com}{Google}}`;

  assertEquals(
    parseFootnote(characterGenerator(sentence)),
    // TODO
    [{
      type: "p",
      attributes: {},
      children: [sentence],
    }],
  );
});
