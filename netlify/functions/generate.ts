// http://localhost:8888/.netlify/functions/generate
import { Buffer } from "buffer";
import { promises as fs } from "fs";
import htm from "htm";
import { getConverter } from "../../html-to-breezewind/convert.ts";
import sharp from "sharp";
import breezewind from "../../breezewind/mod.ts";

const convert = getConverter(htm);
const layout = __dirname + "/layouts/og.html";

const handler = async () => {
  const layoutJson = await fs.readFile(layout, "utf8");
  const ogLayout = convert(layoutJson);

  // TODO: Pull this from site/meta.json
  const meta = {
    "siteName": "Gustwind",
    "colors": {
      "primary": "#3a2fa6",
      "secondary": "#84ebec",
      "tertiary": "#ffffff",
    },
  };
  // TODO: Get route specific info from query
  const route = { meta: {} };

  const svg = await breezewind({
    component: ogLayout,
    components: {},
    context: {
      meta: {
        ...meta,
        ...route.meta,
      },
    },
  });

  // It would be better to stream the image instead of stringifying first
  // but it looks like that might not be supported yet.
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "s-maxage=86400",
    },
    body: (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64"),
    isBase64Encoded: true,
  };
};

export { handler };
