import { promises as fs } from "fs";
import htm from "htm";
import { getConverter } from "../../html-to-breezewind/convert.ts";
import sharp from "sharp";
// import breezewind from "../../breezewind/mod.ts";

const convert = getConverter(htm);
const layout = __dirname + "/layouts/og.html";

const handler = async () => {
  const layoutJson = await fs.readFile(layout, "utf8");
  const ogLayout = convert(layoutJson);

  // console.log(ogLayout);

  // TODO: Pull enough context from the query
  // TODO: Generate svg + convert it to a png
  // return new Response("og image goes here");

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "s-maxage=86400",
    },
    body: "generated something",
    // isBase64Encoded: true,
  };
};

export { handler };
