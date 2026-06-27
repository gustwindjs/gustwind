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

test(`quoted bibtex values`, () => {
  const input = `@article{Knuth92,
  author = "D.E. Knuth",
  title = "Two notes on notation",
  journal = "Amer. Math. Monthly",
  volume = "99",
  year = "1992",
  pages = "403--422",
}`;

  assert.deepEqual(
    parseBibtexCollection(input),
    {
      Knuth92: {
        type: "ARTICLE",
        id: "Knuth92",
        fields: {
          author: "D.E. Knuth",
          title: "Two notes on notation",
          journal: "Amer. Math. Monthly",
          volume: "99",
          year: "1992",
          pages: "403--422",
        },
      },
    },
  );
});

test(`latex accents in all fields`, () => {
  const input = `@article{zhou2012,
  title={Quantifica{\\c{c}}{\\~a}o},
  author={Veps{\\"a}l{\\"a}inen, Juho and Hellas, Arto and Vuorimaa, Petri}
}`;

  assert.deepEqual(
    parseBibtexCollection(input),
    {
      zhou2012: {
        type: "ARTICLE",
        id: "zhou2012",
        fields: {
          title: "Quantificação",
          author: "Vepsäläinen, Juho and Hellas, Arto and Vuorimaa, Petri",
        },
      },
    },
  );
});

test(`latex accent variants`, () => {
  const input = `@article{accents,
  author={{\\"A} {\\"E} {\\"I} {\\"O} {\\"U} {\\"Y} {\\"a} {\\"e} {\\"i} {\\"o} {\\"u} {\\"y} {\\'A} {\\'E} {\\'I} {\\'O} {\\'U} {\\'Y} {\\'a} {\\'e} {\\'i} {\\'o} {\\'u} {\\'y} {\\\`A} {\\\`E} {\\\`I} {\\\`O} {\\\`U} {\\\`a} {\\\`e} {\\\`i} {\\\`o} {\\\`u} {\\^A} {\\^E} {\\^I} {\\^O} {\\^U} {\\^a} {\\^e} {\\^i} {\\^o} {\\^u} {\\~A} {\\~N} {\\~O} {\\~a} {\\~n} {\\~o} {\\c{C}} {\\c{c}}},
  note={\\"A \\'a \\\`i \\^o \\~n \\c{c}}
}`;

  assert.deepEqual(
    parseBibtexCollection(input),
    {
      accents: {
        type: "ARTICLE",
        id: "accents",
        fields: {
          author:
            "Ä Ë Ï Ö Ü Ÿ ä ë ï ö ü ÿ Á É Í Ó Ú Ý á é í ó ú ý À È Ì Ò Ù à è ì ò ù Â Ê Î Ô Û â ê î ô û Ã Ñ Õ ã ñ õ Ç ç",
          note: "Ä á ì ô ñ ç",
        },
      },
    },
  );
});

test(`braced latex accents can omit the backslash`, () => {
  const input = `@article{accents,
  author={{"A} {'a} {\`i} {^o} {~n}},
  note={"A}
}`;

  assert.deepEqual(
    parseBibtexCollection(input),
    {
      accents: {
        type: "ARTICLE",
        id: "accents",
        fields: {
          author: "Ä á ì ô ñ",
          note: "Ä",
        },
      },
    },
  );
});

test(`ignores non-bibtex content`, () => {
  const input = `not bibtex`;

  assert.deepEqual(
    parseBibtexCollection(input),
    {},
  );
});

test(`entry without title`, () => {
  const input = `@article{zhou2012,
  author={Vepsalainen, Juho}
}`;

  assert.deepEqual(
    parseBibtexCollection(input),
    {
      zhou2012: {
        type: "ARTICLE",
        id: "zhou2012",
        fields: {
          author: "Vepsalainen, Juho",
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
