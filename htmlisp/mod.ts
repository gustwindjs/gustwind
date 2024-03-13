import { htm } from "./utilities/htm.js";
import { getConverter as getBreezewindConverter } from "./convert-to-gustwind.ts";
import { getConverter as getHTMLConverter } from "./convert-to-html.ts";

const htmlispToBreezewind = getBreezewindConverter(htm);
const htmlispToHTML = getHTMLConverter(htm);

export { htmlispToBreezewind, htmlispToHTML };
