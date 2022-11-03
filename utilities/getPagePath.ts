/// <reference lib="dom" />

function getPagePath() {
  const pathElement = document.querySelector('meta[name="pagepath"]');

  if (!pathElement) {
    console.error("path element was not found!");

    return;
  }

  const pagePath = pathElement.getAttribute("content");

  if (!pagePath) {
    console.log("pagePath was not found in path element");

    return;
  }

  return pagePath;
}

export { getPagePath };
