import type { Meta } from "../types.ts";

function updateMeta(meta: Meta) {
  const title = document.querySelector("title");

  if (title) {
    title.innerHTML = meta.title || "";
  } else {
    console.warn(`The page doesn't have a <title>!`);
  }

  Object.entries(meta).forEach(([k, v]) => {
    const element = document.head.querySelector("meta[name='" + k + "']");

    if (element) {
      // TODO: Type better by typing possible web socket messages
      element.setAttribute("content", v as string);
    } else {
      console.error("WebSocket", "meta element not found for", k);
    }
  });
}

export default updateMeta;
