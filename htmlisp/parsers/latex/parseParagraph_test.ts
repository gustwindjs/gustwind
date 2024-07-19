import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseParagraph } from "./parseParagraph.ts";
import { characterGenerator } from "../characterGenerator.ts";

Deno.test(`simple sentence`, () => {
  const sentence = "hello world";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    sentence,
  );
});

Deno.test(`simple link`, () => {
  const sentence = "hello \url{https://google.com}";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

Deno.test(`named link`, () => {
  const sentence = "hello \href{https://google.com}{Google}";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

Deno.test(`monospaced word`, () => {
  const sentence = "hello \texttt{world}";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

Deno.test(`bold word`, () => {
  const sentence = "hello \textbf{world}";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

Deno.test(`italic word`, () => {
  const sentence = "hello \textit{world}";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

Deno.test(`multiple sentences`, () => {
  const sentence = `hello
world`;

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

Deno.test(`verbatim`, () => {
  const sentence = `\begin{verbatim}
hello world
\end{verbatim}`;

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

// TODO: Set up a suite with citation types
Deno.test(`sentence with a citation`, () => {
  const sentence = "According to \cite{openWhatFirst}, the first.";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

Deno.test(`sentence with a textual citation`, () => {
  const sentence = "According to \citet{openWhatFirst}, the first.";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

Deno.test(`sentence with a parentheses citation`, () => {
  const sentence = "According to \citep{openWhatFirst}, the first.";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

// TODO: Extract a suite
Deno.test(`footnote`, () => {
  const sentence = "hello world\footnote{and hello again}";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

Deno.test(`simple link in footnote`, () => {
  const sentence = "hello world\footnote{and hello again \url{https://google.com}}";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});


Deno.test(`complex link in footnote`, () => {
  const sentence = "hello world\footnote{and hello again \href{https://google.com}{Google}}";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

// TODO: Extract a suite
Deno.test(`numbered list`, () => {
  const sentence = `\begin{enumerate}
  \item Demo
\end{enumerate}`;

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

Deno.test(`bulleted list`, () => {
  const sentence = `\begin{itemize}
  \item Demo
\end{itemize}`;

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

Deno.test(`description list`, () => {
  const sentence = `\begin{description}
  \item[Foo] bar
\end{description}`;

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

// TODO: Extract a suite
Deno.test(`ref`, () => {
  const sentence = "hello world at \ref{ch:foo}";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

Deno.test(`nameref`, () => {
  const sentence = "hello world at \nameref{ch:foo}";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

Deno.test(`autoref`, () => {
  const sentence = "hello world at \autoref{ch:foo}";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

// TODO: Extract a suite
Deno.test(`chapter title`, () => {
  const sentence = "\chapter{hello world}";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

Deno.test(`section title`, () => {
  const sentence = "\section{hello world}";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

Deno.test(`subsection title`, () => {
  const sentence = "\subsection{hello world}";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

Deno.test(`subsubsection title`, () => {
  const sentence = "\subsubsection{hello world}";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});

Deno.test(`paragraph title`, () => {
  const sentence = "\paragraph{hello world}";

  assertEquals(
    parseParagraph(characterGenerator(sentence)),
    // TODO
    sentence,
  );
});
