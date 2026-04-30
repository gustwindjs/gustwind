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
    Error,
    `No matching expression was found`,
  );
});

test(`throws if argument is missing 2`, () => {
  assert.throws(
    () => parseBibtex(characterGenerator("")),
    Error,
    `No matching expression was found`,
  );
});
