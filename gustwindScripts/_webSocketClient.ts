// utils/getPagePath.ts
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

// utils/updateMeta.ts
function updateMeta(meta) {
  const title = document.querySelector("title");
  if (title) {
    title.innerHTML = meta.title || "";
  } else {
    console.warn(`The page doesn't have a <title>!`);
  }
  Object.entries(meta).forEach(([k, v]) => {
    const element = document.head.querySelector("meta[name='" + k + "']");
    if (element) {
      element.setAttribute("content", v);
    } else {
      console.error("WebSocket", "meta element not found for", k);
    }
  });
}

// scripts/_webSocketClient.ts
function createWebSocket(pagePath) {
  if (!pagePath) {
    return;
  }
  const socket = new WebSocket("ws://localhost:8080");
  socket.addEventListener("message", (event) => {
    let type, payload;
    try {
      const data = JSON.parse(event.data);
      type = data.type;
      payload = data.payload;
    } catch (err) {
      console.error(event, err);
      return;
    }
    if (type === "log") {
      console.log("WebSocket", payload);
    } else if (type === "refresh") {
      console.log("WebSocket", "refreshing");
      const container = document.querySelector("main");
      if (!container) {
        console.error("Failed to find main");
        return;
      }
      container.innerHTML = payload.bodyMarkup;
      updateMeta(payload.meta);
      window.createEditor && window.createEditor();
    } else if (type === "reload") {
      console.log("Websocket", "reloading");
      socket.send(JSON.stringify({
        type: "reload",
        payload: { path: pagePath }
      }));
    } else if (type === "reloadPage") {
      console.log("Websocket", "reloading page");
      location.reload();
    } else if (type === "replaceScript") {
      const { name } = payload;
      const existingScript = document.querySelector(`script[src="${name}"]`) || document.querySelector(`script[data-script="${name}"]`);
      console.log("Websocket", "replacing script");
      if (existingScript) {
        existingScript.remove();
        const script = document.createElement("script");
        script.setAttribute("src", name + "?cache=" + new Date().getTime());
        script.setAttribute("type", "module");
        script.dataset.script = name;
        document.body.appendChild(script);
        window.createEditor && window.createEditor();
      }
    } else {
      console.log("WebSocket", "unknown event", event);
    }
  });
  return socket;
}
if (!("Deno" in globalThis)) {
  const developmentSocket = createWebSocket(getPagePath());
  window.developmentSocket = developmentSocket;
}
