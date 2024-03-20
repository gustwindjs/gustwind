import {
  CAPTURE_ATTRIBUTE,
  PARSE_ATTRIBUTE_NAME,
  PARSE_ATTRIBUTE_VALUE,
} from "./modes.ts";
import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { parseAttributeName, parseAttributeValue } from "./parseAttribute.ts";

Deno.test("parse attribute name", () => {
  assertEquals(
    parseAttributeName("woo", "f").next().value,
    { value: "woof", mode: PARSE_ATTRIBUTE_NAME },
  );
});

Deno.test("parse attribute equals", () => {
  assertEquals(
    parseAttributeName("woo", "=").next().value,
    { value: "woo", mode: PARSE_ATTRIBUTE_VALUE },
  );
});

Deno.test("parse attribute whitespace", () => {
  assertEquals(
    parseAttributeName("woo", " ").next().value,
    { value: "woo", mode: CAPTURE_ATTRIBUTE },
  );
});

Deno.test("parse attribute value", () => {
  assertEquals(
    parseAttributeValue("woo", "f").next().value,
    { value: "woof", mode: PARSE_ATTRIBUTE_VALUE },
  );
});
