import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseTitle } from "./parseTitle.ts";
import { characterGenerator } from "../characterGenerator.ts";

Deno.test(`chapter title`, () => {
  const sentence = "\chapter{hello world}";

  assertEquals(
    parseTitle(characterGenerator(sentence)),
    // TODO
    [{
      type: "p",
      attributes: {},
      children: [sentence],
    }],
  );
});

Deno.test(`section title`, () => {
  const sentence = "\section{hello world}";

  assertEquals(
    parseTitle(characterGenerator(sentence)),
    // TODO
    [{
      type: "p",
      attributes: {},
      children: [sentence],
    }],
  );
});

Deno.test(`subsection title`, () => {
  const sentence = "\subsection{hello world}";

  assertEquals(
    parseTitle(characterGenerator(sentence)),
    // TODO
    [{
      type: "p",
      attributes: {},
      children: [sentence],
    }],
  );
});

Deno.test(`subsubsection title`, () => {
  const sentence = "\subsubsection{hello world}";

  assertEquals(
    parseTitle(characterGenerator(sentence)),
    // TODO
    [{
      type: "p",
      attributes: {},
      children: [sentence],
    }],
  );
});

Deno.test(`paragraph title`, () => {
  const sentence = "\paragraph{hello world}";

  assertEquals(
    parseTitle(characterGenerator(sentence)),
    // TODO
    [{
      type: "p",
      attributes: {},
      children: [sentence],
    }],
  );
});
