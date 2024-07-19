import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseList } from "./parseList.ts";
import { characterGenerator } from "../characterGenerator.ts";

Deno.test(`numbered list`, () => {
  const sentence = String.raw`\begin{enumerate}
  \item Demo
\end{enumerate}`;

  assertEquals(
    parseList(characterGenerator(sentence)),
    // TODO
    [{
      type: "p",
      attributes: {},
      children: [sentence],
    }],
  );
});

Deno.test(`bulleted list`, () => {
  const sentence = String.raw`\begin{itemize}
  \item Demo
\end{itemize}`;

  assertEquals(
    parseList(characterGenerator(sentence)),
    // TODO
    [{
      type: "p",
      attributes: {},
      children: [sentence],
    }],
  );
});

Deno.test(`description list`, () => {
  const sentence = String.raw`\begin{description}
  \item[Foo] bar
\end{description}`;

  assertEquals(
    parseList(characterGenerator(sentence)),
    // TODO
    [{
      type: "p",
      attributes: {},
      children: [sentence],
    }],
  );
});
