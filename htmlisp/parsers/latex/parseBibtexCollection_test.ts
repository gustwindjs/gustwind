import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseBibtexCollection } from "./parseBibtexCollection.ts";

Deno.test(`empty collection`, () => {
  const input = "";

  assertEquals(
    parseBibtexCollection(input),
    {},
  );
});

Deno.test(`single entry`, () => {
  const input = `@BOOK{foobar, title = {Test}}`;

  assertEquals(
    parseBibtexCollection(input),
    {
      foobar: {
        type: "BOOK",
        id: "foobar",
        fields: {
          title: "Test",
        },
      },
    },
  );
});

Deno.test(`two entries`, () => {
  const input = `@BOOK{foobar, title = {Test}}

@ARTICLE{barfoo, title = {Test}}`;

  assertEquals(
    parseBibtexCollection(input),
    {
      foobar: {
        type: "BOOK",
        id: "foobar",
        fields: {
          title: "Test",
        },
      },
      barfoo: {
        type: "ARTICLE",
        id: "barfoo",
        fields: {
          title: "Test",
        },
      },
    },
  );
});
