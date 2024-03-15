import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("xml", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: '<?xml version="1.0" encoding="utf-8" ?>',
    }),
    '<?xml version="1.0" encoding="utf-8" ?>',
  );
});

Deno.test("xml and content", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<?xml version="1.0" encoding="utf-8" ?>
      <feed
      __reference="https://kevincox.ca/2022/05/06/rss-feed-best-practices/"
      xmlns="http://www.w3.org/2005/Atom"
    >
      <title &children="(get context meta.siteName)"></title>
    </feed>`,
      context: {
        meta: { siteName: "demo" },
      },
    }),
    `<?xml version="1.0" encoding="utf-8" ?>
<feed
__reference="https://kevincox.ca/2022/05/06/rss-feed-best-practices/"
xmlns="http://www.w3.org/2005/Atom"
><title>demo</title>
</feed>`,
  );
});
