import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseTitle } from "./parseTitle.ts";
import { characterGenerator } from "../characterGenerator.ts";

Deno.test(`chapter title`, () => {
  const sentence = String.raw`\chapter{hello world}`;

  assertEquals(
    parseTitle(characterGenerator(sentence)),
    [{
      type: "h1",
      attributes: {},
      children: ["hello world"],
    }],
  );
});

Deno.test(`section title`, () => {
  const sentence = String.raw`\section{hello world}`;

  assertEquals(
    parseTitle(characterGenerator(sentence)),
    [{
      type: "h2",
      attributes: {},
      children: ["hello world"],
    }],
  );
});

Deno.test(`subsection title`, () => {
  const sentence = String.raw`\subsection{hello world}`;

  assertEquals(
    parseTitle(characterGenerator(sentence)),
    [{
      type: "h3",
      attributes: {},
      children: ["hello world"],
    }],
  );
});

Deno.test(`subsubsection title`, () => {
  const sentence = String.raw`\subsubsection{hello world}`;

  assertEquals(
    parseTitle(characterGenerator(sentence)),
    [{
      type: "h4",
      attributes: {},
      children: ["hello world"],
    }],
  );
});

Deno.test(`paragraph title`, () => {
  const sentence = String.raw`\paragraph{hello world}`;

  assertEquals(
    parseTitle(characterGenerator(sentence)),
    [{
      type: "b",
      attributes: {},
      children: ["hello world"],
    }],
  );
});
