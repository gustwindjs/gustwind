import assert from "node:assert/strict";
import test from "node:test";
import { parseBibtex } from "./bibtex.ts";
import { characterGenerator } from "../../characterGenerator.ts";

test(`empty entry`, () => {
  const type = "BOOK";

  assert.deepEqual(
    parseBibtex(characterGenerator(`@${type}{}`)),
    { type, id: "", fields: {} },
  );
});

test(`entry with an id`, () => {
  const type = "BOOK";
  const id = "foobar";

  assert.deepEqual(
    parseBibtex(characterGenerator(`@${type}{${id}}`)),
    { type, id, fields: {} },
  );
});

test(`trims entry type and id`, () => {
  assert.deepEqual(
    parseBibtex(characterGenerator(`@BOOK  {  foobar  }`)),
    { type: "BOOK", id: "foobar", fields: {} },
  );
});

test(`entry with a field in a single line`, () => {
  const type = "BOOK";
  const id = "foobar";
  const fieldName = "author";
  const value = "John Doe";

  assert.deepEqual(
    parseBibtex(
      characterGenerator(`@${type}{${id}, ${fieldName} = {${value}}`),
    ),
    { type, id, fields: { [fieldName]: value } },
  );
});

test(`trims field keys and bare values`, () => {
  assert.deepEqual(
    parseBibtex(characterGenerator(`@BOOK{foobar,  year   =   1992   }`)),
    { type: "BOOK", id: "foobar", fields: { year: "1992" } },
  );
});

test(`trims quoted field values`, () => {
  assert.deepEqual(
    parseBibtex(characterGenerator(`@BOOK{foobar, title = " Testing book "}`)),
    { type: "BOOK", id: "foobar", fields: { title: "Testing book" } },
  );
});

test(`trims balanced field values`, () => {
  assert.deepEqual(
    parseBibtex(characterGenerator(`@BOOK{foobar, title = { Testing book }}`)),
    { type: "BOOK", id: "foobar", fields: { title: "Testing book" } },
  );
});

test(`name with an umlaut`, () => {
  const type = "BOOK";
  const id = "foobar";
  const fieldName = "author";
  const value = `John D{\"o}e`;

  assert.deepEqual(
    parseBibtex(
      characterGenerator(`@${type}{${id}, ${fieldName} = {${value}}`),
    ),
    { type, id, fields: { [fieldName]: value } },
  );
});

test(`name with a comma`, () => {
  const type = "BOOK";
  const id = "foobar";
  const fieldName = "author";
  const value = "Doe, John";

  assert.deepEqual(
    parseBibtex(
      characterGenerator(`@${type}{${id}, ${fieldName} = {${value}}`),
    ),
    { type, id, fields: { [fieldName]: value } },
  );
});

test(`entry with quoted fields`, () => {
  assert.deepEqual(
    parseBibtex(characterGenerator(`@article{Knuth92,
  author = "D.E. Knuth",
  title = "Two notes on notation",
  journal = "Amer. Math. Monthly",
  volume = "99",
  year = "1992",
  pages = "403--422",
}`)),
    {
      type: "article",
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
  );
});

test(`entry with bare fields`, () => {
  assert.deepEqual(
    parseBibtex(characterGenerator(`@article{Knuth92,
  volume = 99,
  year = 1992
}`)),
    {
      type: "article",
      id: "Knuth92",
      fields: {
        volume: "99",
        year: "1992",
      },
    },
  );
});

test(`preserves nested braces in field values`, () => {
  assert.deepEqual(
    parseBibtex(characterGenerator(`@article{Knuth92,
  title = {{T}wo notes on notation}
}`)),
    {
      type: "article",
      id: "Knuth92",
      fields: {
        title: "{T}wo notes on notation",
      },
    },
  );
});

test(`preserves a single balanced brace in field values`, () => {
  assert.deepEqual(
    parseBibtex(characterGenerator(`@article{Knuth92,
  title = {{T}}
}`)),
    {
      type: "article",
      id: "Knuth92",
      fields: {
        title: "{T}",
      },
    },
  );
});

test(`entry with a field in multiple lines`, () => {
  const type = "BOOK";
  const id = "foobar";
  const fieldName = "author";
  const value = "John Doe";

  assert.deepEqual(
    parseBibtex(characterGenerator(`@${type}{${id},
  ${fieldName} = {${value}}
}`)),
    { type, id, fields: { [fieldName]: value } },
  );
});

test(`entry with fields in multiple lines`, () => {
  const type = "BOOK";
  const id = "foobar";
  const fieldName1 = "author";
  const value1 = "John Doe";
  const fieldName2 = "title";
  const value2 = "Testing book";

  assert.deepEqual(
    parseBibtex(characterGenerator(`@${type}{${id},
  ${fieldName1} = {${value1}},
  ${fieldName2} = {${value2}}
}`)),
    { type, id, fields: { [fieldName1]: value1, [fieldName2]: value2 } },
  );
});

test(`parses only the first entry`, () => {
  const type = "BOOK";
  const id = "foobar";
  const fieldName1 = "author";
  const value1 = "John Doe";
  const fieldName2 = "title";
  const value2 = "Testing book";
  const input = `@${type}{${id},
  ${fieldName1} = {${value1}},
  ${fieldName2} = {${value2}}
}`;

  assert.deepEqual(
    parseBibtex(characterGenerator(input + " " + input)),
    { type, id, fields: { [fieldName1]: value1, [fieldName2]: value2 } },
  );
});

test(`throws if argument is missing`, () => {
  assert.throws(
    () => parseBibtex(characterGenerator("foo")),
    { message: "No matching expression was found" },
  );
});

test(`throws if argument is missing 2`, () => {
  assert.throws(
    () => parseBibtex(characterGenerator("")),
    { message: "No matching expression was found" },
  );
});

test(`throws if entry type is missing`, () => {
  assert.throws(
    () => parseBibtex(characterGenerator("@{id}")),
    { message: "No matching expression was found" },
  );
});

test(`throws if a field key is missing`, () => {
  assert.throws(
    () => parseBibtex(characterGenerator("@BOOK{id, = value}")),
    { message: "No matching expression was found" },
  );
});

test(`throws if a field assignment is missing`, () => {
  assert.throws(
    () => parseBibtex(characterGenerator("@BOOK{id, year}")),
    { message: "No matching expression was found" },
  );
});
