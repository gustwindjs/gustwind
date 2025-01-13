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

Deno.test(`multiple authors`, () => {
  const input = `@article{zhou2012,
  title={Quantifying},
  author={Zhou, Yan-Bo and Li, Menghui},
}`;

  assertEquals(
    parseBibtexCollection(input),
    {
      zhou2012: {
        type: "ARTICLE",
        id: "zhou2012",
        fields: {
          title: "Quantifying",
          author: "Zhou, Yan-Bo and Li, Menghui",
        },
      },
    },
  );
});

Deno.test(`author ä umlaut`, () => {
  const input = `@article{zhou2012,
  title={Quantifying},
  author={Veps{\"a}l{\"a}inen, Juho}
}`;

  assertEquals(
    parseBibtexCollection(input),
    {
      zhou2012: {
        type: "ARTICLE",
        id: "zhou2012",
        fields: {
          title: "Quantifying",
          author: "Vepsäläinen, Juho",
        },
      },
    },
  );
});

Deno.test(`author ö umlaut`, () => {
  const input = `@article{zhou2012,
  title={Quantifying},
  author={Veps{\"o}l{\"o}inen, Juho}
}`;

  assertEquals(
    parseBibtexCollection(input),
    {
      zhou2012: {
        type: "ARTICLE",
        id: "zhou2012",
        fields: {
          title: "Quantifying",
          author: "Vepsölöinen, Juho",
        },
      },
    },
  );
});

Deno.test(`author ü umlaut`, () => {
  const input = `@article{zhou2012,
  title={Quantifying},
  author={Veps{\"u}l{\"u}inen, Juho}
}`;

  assertEquals(
    parseBibtexCollection(input),
    {
      zhou2012: {
        type: "ARTICLE",
        id: "zhou2012",
        fields: {
          title: "Quantifying",
          author: "Vepsülüinen, Juho",
        },
      },
    },
  );
});
