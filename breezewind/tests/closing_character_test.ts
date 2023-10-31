import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import breeze from "../index.ts";

Deno.test("allow customizing closing character", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "!DOCTYPE",
        attributes: {
          html: true,
          language: {
            utility: "get",
            parameters: ["context", "meta.language"],
          },
        },
        closingCharacter: "",
      },
      context: {
        meta: {
          language: "en",
        },
      },
    }),
    '<!DOCTYPE html language="en" >',
  );
});

Deno.test("allow rendering xml heading", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "?xml",
        attributes: {
          version: "1.0",
          encoding: "UTF-8",
        },
        closingCharacter: "?",
      },
    }),
    '<?xml version="1.0" encoding="UTF-8" ?>',
  );
});
