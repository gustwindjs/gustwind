// http://localhost:8888/.netlify/functions/og
import { Buffer } from "buffer";
import { promises as fs } from "fs";
import sharp from "sharp";
import type { Handler, HandlerEvent } from "@netlify/functions";
import { htmlispToHTML } from "../../htmlisp/mod.ts";

// These paths have to be included at netlify.toml
const metaPath = __dirname + "/../../site/meta.json";
const layoutPath = __dirname + "/layouts/og.html";

const handler = async (event: HandlerEvent): Handler => {
  const meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
  const layoutHtml = await fs.readFile(layoutPath, "utf8");
  const qs = event.queryStringParameters;

  const svg = await htmlispToHTML({
    htmlInput: layoutHtml,
    components: {},
    context: { meta: { ...meta, ...qs } },
  });

  // It would be better to stream the image instead of stringifying first
  // but it looks like that might not be supported yet.
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "image/png",
      // 24h cache
      "Cache-Control": "s-maxage=86400",
    },
    body: (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64"),
    isBase64Encoded: true,
  };
};

export { handler };
