import htm from "https://esm.sh/htm@3.1.1";
import { getConverter } from "./convert-to-gustwind.ts";

// @ts-expect-error I'm not sure how to type this but it doesn't matter
const htmlToBreezewind = getConverter(htm);

export { htmlToBreezewind };
