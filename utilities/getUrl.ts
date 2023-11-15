/// <reference lib="dom" />

function getUrl() {
  const pathElement = document.querySelector('meta[name="url"]');

  if (!pathElement) {
    console.error("url meta field was not found!");

    return;
  }

  const pagePath = pathElement.getAttribute("content");

  if (!pagePath) {
    console.log("valid path was not found in url element");

    return;
  }

  return pagePath;
}

export { getUrl };
