import { promises as fs } from "fs";
// import fs from "fs";
import sharp from "sharp";
// import { htmlToBreezewind } from "../../html-to-breezewind/mod.ts";
// import breezewind from "../../breezewind/mod.ts";

const layout = __dirname + "/layouts/og.html";

const handler = async () => {
  const layoutJson = await fs.readFile(layout, "utf8");

  // TODO: Allow injecting htm to this
  // const ogLayout = htmlToBreezewind(layoutJson);

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
