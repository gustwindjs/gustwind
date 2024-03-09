import htm from "https://esm.sh/htm@3.1.1";
import { getConverter as getBreezewindConverter } from "./convert-to-gustwind.ts";
import { getConverter as getHTMLConverter } from "./convert-to-html.ts";

// @ts-expect-error I'm not sure how to type this but it doesn't matter
const htmlispToBreezewind = getBreezewindConverter(htm);

// @ts-expect-error I'm not sure how to type this but it doesn't matter
const htmlispToHTML = getHTMLConverter(htm);

export { htmlispToBreezewind, htmlispToHTML };
