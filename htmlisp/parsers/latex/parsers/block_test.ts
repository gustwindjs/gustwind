import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseBlock } from "./block.ts";
import { parseContent } from "./content.ts";
import { parseDefinitionItem } from "./definition_item.ts";
import { parseListItem } from "./list_item.ts";
import { characterGenerator } from "../../characterGenerator.ts";

Deno.test(`simple expression`, () => {
  const name = "verbatim";
  const input = "foobar";

  assertEquals(
    parseBlock(
      characterGenerator(String.raw`\begin{${name}}${input}\end{${name}}`),
      {
        [name]: {
          container: (children) => ({
            type: "div",
            attributes: {},
            children,
          }),
          item: parseContent,
        },
      },
    ),
    { type: "div", attributes: {}, children: [input] },
  );
});

Deno.test(`simple list`, () => {
  const name = "itemize";

  assertEquals(
    parseBlock<string>(
      characterGenerator(String.raw`\begin{${name}}
  \item Foo
  \item Bar
\end{${name}}`),
      {
        [name]: {
          container: (children) => ({
            type: "div",
            attributes: {},
            children,
          }),
          item: parseListItem,
        },
      },
    ),
    { type: "div", attributes: {}, children: ["Foo", "Bar"] },
  );
});

Deno.test(`simple definition list`, () => {
  const name = "itemize";

  assertEquals(
    parseBlock<ReturnType<typeof parseDefinitionItem>>(
      characterGenerator(String.raw`\begin{${name}}
  \item[Foo] foo
  \item[Bar] bar
\end{${name}}`),
      {
        [name]: {
          container: (children) => ({
            type: "div",
            attributes: {},
            children: children
              .map(({ title, description }) => `${title}: ${description}`),
          }),
          item: parseDefinitionItem,
        },
      },
    ),
    { type: "div", attributes: {}, children: ["Foo: foo", "Bar: bar"] },
  );
});

// TODO: Assert that begin/end block names are the same - if not, throw
// TODO: Test that the logic throws in case a matching expression was not found
// TODO: Test that the logic throws in case an expression is incomplete
