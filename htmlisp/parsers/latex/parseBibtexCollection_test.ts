import assert from "node:assert/strict";
import test from "node:test";
import { parseBibtexCollection } from "./parseBibtexCollection.ts";

test(`empty collection`, () => {
  const input = "";

  assert.deepEqual(
    parseBibtexCollection(input),
    {},
  );
});

test(`single entry`, () => {
  const input = `@BOOK{foobar, title = {Test}}`;

  assert.deepEqual(
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

test(`remote title braces`, () => {
  const input = `@BOOK{foobar, title = {{T}est}}`;

  assert.deepEqual(
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

test(`two entries`, () => {
  const input = `@BOOK{foobar, title = {Test}}

@ARTICLE{barfoo, title = {Test}}`;

  assert.deepEqual(
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

test(`multiple authors`, () => {
  const input = `@article{zhou2012,
  title={Quantifying},
  author={Zhou, Yan-Bo and Li, Menghui},
}`;

  assert.deepEqual(
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

test(`author ä umlaut`, () => {
  const input = `@article{zhou2012,
  title={Quantifying},
  author={Veps{\"a}l{\"a}inen, Juho}
}`;

  assert.deepEqual(
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

test(`author ö umlaut`, () => {
  const input = `@article{zhou2012,
  title={Quantifying},
  author={Veps{\"o}l{\"o}inen, Juho}
}`;

  assert.deepEqual(
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

test(`author ü umlaut`, () => {
  const input = `@article{zhou2012,
  title={Quantifying},
  author={Veps{\"u}l{\"u}inen, Juho}
}`;

  assert.deepEqual(
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
