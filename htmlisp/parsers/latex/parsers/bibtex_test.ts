import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseBibtex } from "./bibtex.ts";
import { characterGenerator } from "../../characterGenerator.ts";

Deno.test(`empty entry`, () => {
  const type = "BOOK";

  assertEquals(
    parseBibtex({ getCharacter: characterGenerator(`@${type}{}`) }),
    { type, id: "", fields: {} },
  );
});

Deno.test(`entry with an id`, () => {
  const type = "BOOK";
  const id = "foobar";

  assertEquals(
    parseBibtex({ getCharacter: characterGenerator(`@${type}{${id}}`) }),
    { type, id, fields: {} },
  );
});

Deno.test(`entry with a field in a single line`, () => {
  const type = "BOOK";
  const id = "foobar";
  const fieldName = "author";
  const value = "John Doe";

  assertEquals(
    parseBibtex(
      {
        getCharacter: characterGenerator(
          `@${type}{${id}, ${fieldName} = {${value}}`,
        ),
      },
    ),
    { type, id, fields: { [fieldName]: value } },
  );
});

Deno.test(`name with an umlaut`, () => {
  const type = "BOOK";
  const id = "foobar";
  const fieldName = "author";
  const value = `John D{\"o}e`;

  assertEquals(
    parseBibtex(
      {
        getCharacter: characterGenerator(
          `@${type}{${id}, ${fieldName} = {${value}}`,
        ),
      },
    ),
    { type, id, fields: { [fieldName]: value } },
  );
});

Deno.test(`name with a comma`, () => {
  const type = "BOOK";
  const id = "foobar";
  const fieldName = "author";
  const value = "Doe, John";

  assertEquals(
    parseBibtex(
      {
        getCharacter: characterGenerator(
          `@${type}{${id}, ${fieldName} = {${value}}`,
        ),
      },
    ),
    { type, id, fields: { [fieldName]: value } },
  );
});

Deno.test(`entry with a field in multiple lines`, () => {
  const type = "BOOK";
  const id = "foobar";
  const fieldName = "author";
  const value = "John Doe";

  assertEquals(
    parseBibtex(
      {
        getCharacter: characterGenerator(`@${type}{${id},
  ${fieldName} = {${value}}
}`),
      },
    ),
    { type, id, fields: { [fieldName]: value } },
  );
});

Deno.test(`entry with fields in multiple lines`, () => {
  const type = "BOOK";
  const id = "foobar";
  const fieldName1 = "author";
  const value1 = "John Doe";
  const fieldName2 = "title";
  const value2 = "Testing book";

  assertEquals(
    parseBibtex(
      {
        getCharacter: characterGenerator(`@${type}{${id},
  ${fieldName1} = {${value1}},
  ${fieldName2} = {${value2}}
}`),
      },
    ),
    { type, id, fields: { [fieldName1]: value1, [fieldName2]: value2 } },
  );
});

Deno.test(`parses only the first entry`, () => {
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

  assertEquals(
    parseBibtex({ getCharacter: characterGenerator(input + " " + input) }),
    { type, id, fields: { [fieldName1]: value1, [fieldName2]: value2 } },
  );
});

Deno.test(`throws if argument is missing`, () => {
  assertThrows(
    () => parseBibtex({ getCharacter: characterGenerator("foo") }),
    Error,
    `No matching expression was found`,
  );
});

Deno.test(`throws if argument is missing 2`, () => {
  assertThrows(
    () => parseBibtex({ getCharacter: characterGenerator("") }),
    Error,
    `No matching expression was found`,
  );
});
