import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseBibtex } from "./bibtex.ts";

Deno.test(`empty entry`, () => {
  const type = "BOOK";

  assertEquals(
    parseBibtex(`@${type}{}`),
    { type },
  );
});

Deno.test(`entry with an id`, () => {
  const type = "BOOK";
  const id = "foobar";

  assertEquals(
    parseBibtex(`@${type}{}`),
    { type, id },
  );
});

Deno.test(`entry with a field in a single line`, () => {
  const type = "BOOK";
  const id = "foobar";
  const fieldName = "author";
  const value = "John Doe";

  assertEquals(
    parseBibtex(`@${type}{${id}, ${fieldName} = ${value}}`),
    { type, id, fields: { [fieldName]: value } },
  );
});

Deno.test(`entry with a field in multiple lines`, () => {
  const type = "BOOK";
  const id = "foobar";
  const fieldName = "author";
  const value = "John Doe";

  assertEquals(
    parseBibtex(`@${type}{${id},
  ${fieldName} = ${value}
}`),
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
    parseBibtex(`@${type}{${id},
  ${fieldName1} = ${value1},
  ${fieldName2} = ${value2}
}`),
    { type, id, fields: { [fieldName1]: value1, [fieldName2]: value2 } },
  );
});

Deno.test(`throws if argument is missing`, () => {
  assertThrows(
    () => parseBibtex("foo"),
    Error,
    `No matching expression was found`,
  );
});
