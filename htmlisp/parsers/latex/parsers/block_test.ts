import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseBlock } from "./block.ts";
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
          // TODO: Use content parser here instead and make content parser
          // more robust
          item: (s) => s.next() as string,
        },
      },
    ),
    { type: "div", attributes: {}, children: [input] },
  );
});

Deno.test(`simple list`, () => {
  const name = "itemize";

  assertEquals(
    parseBlock(
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
          // TODO: Attach list item parser here
          item: parseListItem, /* (s) => parseListItem(
                characterGenerator(s),
              ),*/
        },
      },
    ),
    { type: "div", attributes: {}, children: ["foo", "bar"] },
  );
});

// TODO: Test definition list composition

// TODO: Assert that begin/end block names are the same - if not, throw
// TODO: Test that the logic throws in case a matching expression was not found
// TODO: Test that the logic throws in case an expression is incomplete
