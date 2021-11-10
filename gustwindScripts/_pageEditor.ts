// browserDeps.ts
import * as immer from "https://cdn.skypack.dev/immer@9.0.6?min";
import {
  nanoid as nanoid2
} from "https://cdn.skypack.dev/nanoid@3.1.30?min";
import * as twind from "https://cdn.skypack.dev/twind@0.16.16?min";
import * as twindColors from "https://cdn.skypack.dev/twind@0.16.16/colors?min";
import * as twindSheets from "https://cdn.skypack.dev/twind@0.16.16/sheets?min";
import * as twindShim from "https://cdn.skypack.dev/twind@0.16.16/shim?min";
import twindTypography from "https://cdn.skypack.dev/@twind/typography@0.0.2?min";
var id = nanoid2;

// utils/draggable.ts
function draggable({ element, handle, xPosition }, cbs) {
  if (!element) {
    console.warn("drag is missing elem!");
    return;
  }
  dragTemplate(element, "touchstart", "touchmove", "touchend", cbs, handle, xPosition);
  dragTemplate(element, "mousedown", "mousemove", "mouseup", cbs, handle, xPosition);
}
function dragTemplate(elem, down, move, up, cbs, handle, xPosition) {
  cbs = getCbs(cbs, xPosition = "left");
  const beginCb = cbs.begin;
  const changeCb = cbs.change;
  const endCb = cbs.end;
  on(handle || elem, down, (e) => {
    const moveHandler = (e2) => callCb(changeCb, elem, e2);
    function upHandler() {
      off(document, move, moveHandler);
      off(document, up, upHandler);
      callCb(endCb, elem, e);
    }
    on(document, move, moveHandler);
    on(document, up, upHandler);
    callCb(beginCb, elem, e);
  });
}
function on(elem, evt, handler) {
  let supportsPassive = false;
  try {
    const opts = Object.defineProperty({}, "passive", {
      get: function() {
        supportsPassive = true;
        return void 0;
      }
    });
    globalThis.addEventListener("testPassive", null, opts);
    globalThis.removeEventListener("testPassive", null, opts);
  } catch (err) {
    console.error(err);
  }
  elem.addEventListener(evt, handler, supportsPassive ? { passive: false } : false);
}
function off(elem, evt, handler) {
  elem.removeEventListener(evt, handler, false);
}
function getCbs(cbs, xPosition = "left") {
  if (cbs) {
    return {
      begin: cbs.begin || noop,
      change: cbs.change || noop,
      end: cbs.end || noop
    };
  }
  let initialOffset;
  let initialPos;
  return {
    begin: function(c) {
      const bodyWidth = document.body.clientWidth;
      initialOffset = {
        x: xPosition === "left" ? c.elem.offsetLeft : bodyWidth - c.elem.offsetLeft - c.elem.clientWidth,
        y: c.elem.offsetTop
      };
      initialPos = xPosition === "left" ? c.cursor : { x: bodyWidth - c.cursor.x, y: c.cursor.y };
    },
    change: function(c) {
      if (typeof initialOffset.x !== "number" || typeof c.cursor.x !== "number" || typeof initialPos.x !== "number") {
        return;
      }
      const bodyWidth = document.body.clientWidth;
      style(c.elem, xPosition, xPosition === "left" ? initialOffset.x + c.cursor.x - initialPos.x + "px" : initialOffset.x + (bodyWidth - c.cursor.x) - initialPos.x + "px");
      if (typeof initialOffset.y !== "number" || typeof c.cursor.y !== "number" || typeof initialPos.y !== "number") {
        return;
      }
      style(c.elem, "top", initialOffset.y + c.cursor.y - initialPos.y + "px");
    },
    end: noop
  };
}
function style(e, prop, value) {
  e.style[prop] = value;
}
function noop() {
}
function callCb(cb, elem, e) {
  e.preventDefault();
  const offset = findPos(elem);
  const width = elem.clientWidth;
  const height = elem.clientHeight;
  const cursor = {
    x: cursorX(elem, e),
    y: cursorY(elem, e)
  };
  if (typeof cursor.x !== "number" || typeof cursor.y !== "number") {
    return;
  }
  const x = (cursor.x - offset.x) / width;
  const y = (cursor.y - offset.y) / height;
  cb({
    x: isNaN(x) ? 0 : x,
    y: isNaN(y) ? 0 : y,
    cursor,
    elem,
    e
  });
}
function findPos(e) {
  const r = e.getBoundingClientRect();
  return {
    x: r.left,
    y: r.top
  };
}
function cursorX(_elem, evt) {
  if (evt instanceof TouchEvent) {
    return evt.touches.item(0)?.clientX;
  }
  return evt.clientX;
}
function cursorY(_elem, evt) {
  if (evt instanceof TouchEvent) {
    return evt.touches.item(0)?.clientY;
  }
  return evt.clientY;
}

// utils/functional.ts
var isObject = (a) => typeof a === "object";
function get(dataContext, key) {
  let value = dataContext;
  key.split(".").forEach((k) => {
    if (isObject(value)) {
      value = value[k];
    }
  });
  return value;
}

// utils/importScript.ts
var loadedScripts = {};
function importScript(src) {
  return new Promise((resolve, reject) => {
    if (loadedScripts[src]) {
      return resolve("loadedAlready");
    }
    loadedScripts[src] = true;
    const script = document.createElement("script");
    script.setAttribute("type", "module");
    script.setAttribute("src", src);
    script.onload = () => resolve("loaded");
    script.onerror = () => reject();
    document.body.appendChild(script);
  });
}

// src/transform.ts
async function transform(transformsPath, transformNames, input) {
  if (!transformNames) {
    return Promise.resolve({ content: input });
  }
  if ("Deno" in globalThis) {
    const path = await import("https://deno.land/std@0.107.0/path/mod.ts");
    const transforms = await Promise.all(transformNames.map((name) => {
      const transformPath = path.join(transformsPath, `${name}.ts`);
      Deno.env.get("DEBUG") === "1" && console.log("importing transform", transformPath, transformsPath, name);
      return import("file://" + transformPath);
    }));
    return transforms.reduce((input2, current) => current.default(input2), input);
  }
  return Promise.all(transformNames.map((name) => importScript(`/transforms/${name}.js`)));
}

// src/renderComponent.ts
async function renderComponent(transformsPath, component, components, context) {
  if (typeof component === "string") {
    return component;
  }
  const foundComponent = component.element && components[component.element];
  if (component.__bind) {
    if (isObject(component.__bind)) {
      context = { ...context, __bound: component.__bind };
    } else {
      context = { ...context, __bound: get(context, component.__bind) };
    }
  }
  if (foundComponent) {
    return await renderComponent(transformsPath, {
      element: "",
      children: Array.isArray(foundComponent) ? foundComponent : [{
        ...component,
        ...foundComponent,
        class: joinClasses(component.class, foundComponent.class)
      }]
    }, components, context);
  }
  if (component?.transformWith) {
    let transformedContext;
    if (typeof component.inputText === "string") {
      transformedContext = await transform(transformsPath, component?.transformWith, component.inputText);
    } else if (typeof component.inputProperty === "string") {
      const input = get(context, component.inputProperty);
      if (!input) {
        console.error("Missing input", context, component.inputProperty);
        throw new Error("Missing input");
      }
      transformedContext = await transform(transformsPath, component?.transformWith, input);
    }
    context = { ...context, ...transformedContext };
  }
  let children;
  if (component.__children) {
    const boundChildren = component.__children;
    const ctx = context.__bound || context;
    if (typeof boundChildren === "string") {
      children = get(ctx, boundChildren);
    } else {
      children = (await Promise.all((Array.isArray(ctx) ? ctx : [ctx]).flatMap((d) => boundChildren.map((c) => renderComponent(transformsPath, c, components, {
        ...context,
        __bound: d
      }))))).join("");
    }
  } else {
    children = Array.isArray(component.children) ? (await Promise.all(component.children.map(async (component2) => await renderComponent(transformsPath, component2, components, context)))).join("") : component.children;
  }
  return wrapInElement(component.element, generateAttributes({
    ...component.attributes,
    class: resolveClass(component, context)
  }, context), children);
}
function resolveClass(component, context) {
  const classes = [];
  if (component.__class) {
    Object.entries(component.__class).forEach(([klass, expression]) => {
      if (evaluateExpression(expression, {
        attributes: component.attributes,
        context
      })) {
        classes.push(twind.tw(klass));
      }
    });
  }
  if (!component.class) {
    return classes.join(" ");
  }
  return twind.tw(classes.concat(component.class.split(" ")).join(" "));
}
function joinClasses(a, b) {
  if (a) {
    if (b) {
      return `${a} ${b}`;
    }
    return a;
  }
  return b || "";
}
function wrapInElement(element, attributes, children) {
  if (!element) {
    return typeof children === "string" ? children : "";
  }
  return `<${element}${attributes}>${children || ""}</${element}>`;
}
function generateAttributes(attributes, context) {
  const ret = Object.entries(attributes).map(([k, v]) => {
    if (k.startsWith("__")) {
      return `${k.slice(2)}="${evaluateExpression(v, context.__bound)}"`;
    }
    return `${k}="${v}"`;
  }).filter(Boolean).join(" ");
  return ret.length > 0 ? " " + ret : "";
}
function evaluateExpression(expression, value = {}) {
  try {
    return Function.apply(null, Object.keys(value).concat(`return ${expression}`))(...Object.values(value));
  } catch (err) {
    console.error("Failed to evaluate", expression, value, err);
  }
}

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

// utils/traversePage.ts
function traversePage(page, operation) {
  let i = 0;
  function recurse(page2, operation2) {
    if (Array.isArray(page2)) {
      page2.forEach((p) => recurse(p, operation2));
    } else {
      operation2(page2, i);
      i++;
      if (Array.isArray(page2.children)) {
        recurse(page2.children, operation2);
      }
    }
  }
  recurse(page, operation);
}

// scripts/_pageEditor.ts
var documentTreeElementId = "document-tree-element";
var controlsElementId = "controls-element";
async function createEditor() {
  console.log("create editor");
  const [components, context, pageDefinition] = await Promise.all([
    fetch("/components.json").then((res) => res.json()),
    fetch("./context.json").then((res) => res.json()),
    fetch("./definition.json").then((res) => res.json())
  ]);
  const editorContainer = createEditorContainer(pageDefinition);
  const selectionContainer = document.createElement("div");
  selectionContainer.setAttribute("x-label", "selected");
  selectionContainer.setAttribute("x-state", "{ componentId: undefined }");
  editorContainer.appendChild(selectionContainer);
  const pageEditor = await createPageEditor(components, context);
  selectionContainer.append(pageEditor);
  const componentEditor = await createComponentEditor(components, context);
  selectionContainer.append(componentEditor);
  document.body.appendChild(editorContainer);
  evaluateAllDirectives();
}
var editorsId = "editors";
function createEditorContainer(pageDefinition) {
  let editorsElement = document.getElementById(editorsId);
  editorsElement?.remove();
  editorsElement = document.createElement("div");
  editorsElement.id = editorsId;
  editorsElement.style.visibility = "visible";
  editorsElement.setAttribute("x-state", JSON.stringify({
    ...pageDefinition,
    page: initializePage(pageDefinition.page)
  }));
  editorsElement.setAttribute("x-label", "editor");
  return editorsElement;
}
function toggleEditorVisibility() {
  const editorsElement = document.getElementById(editorsId);
  if (!editorsElement) {
    return;
  }
  editorsElement.style.visibility = editorsElement.style.visibility === "visible" ? "hidden" : "visible";
}
function initializePage(page) {
  return immer.produce(page, (draftPage) => {
    traversePage(draftPage, (p) => {
      p._id = id();
    });
  });
}
function updateFileSystem(state) {
  const nextPage = immer.produce(state.page, (draftPage) => {
    traversePage(draftPage, (p) => {
      delete p._id;
      if (p.class === "") {
        delete p.class;
      }
    });
  });
  const payload = {
    path: getPagePath(),
    data: { ...state, page: nextPage }
  };
  window.developmentSocket.send(JSON.stringify({ type: "update", payload }));
}
async function createPageEditor(components, context) {
  console.log("Creating page editor");
  const treeElement = document.createElement("div");
  treeElement.id = documentTreeElementId;
  treeElement.innerHTML = await renderComponent("", components.PageEditor, components, context);
  const aside = treeElement.children[0];
  const handle = aside.children[0];
  draggable({ element: aside, handle });
  return treeElement;
}
async function createComponentEditor(components, context) {
  const controlsElement = document.createElement("div");
  controlsElement.id = controlsElementId;
  controlsElement.innerHTML = await renderComponent("", components.ComponentEditor, components, context);
  const aside = controlsElement.children[0];
  const handle = aside.children[0];
  draggable({ element: aside, handle, xPosition: "right" });
  return controlsElement;
}
function metaChanged(element, value) {
  const { editor: { meta } } = getState(element);
  const field = element.dataset.field;
  if (field === "title") {
    const titleElement = document.querySelector("title");
    if (titleElement) {
      titleElement.innerHTML = value || "";
    } else {
      console.warn("The page doesn't have a <title>!");
    }
  } else {
    const metaElement = document.head.querySelector("meta[name='" + field + "']");
    if (metaElement) {
      metaElement.setAttribute("content", value);
    } else {
      console.warn(`The page doesn't have a ${field} meta element!`);
    }
  }
  setState({ meta: { ...meta, [field]: value } }, {
    element,
    parent: "editor"
  });
}
var hoveredElements = new Set();
function elementClicked(element, componentId) {
  event?.stopPropagation();
  const { editor: { page } } = getState(element);
  const focusOutListener = (e) => {
    const inputElement = e.target;
    if (!inputElement) {
      console.warn("inputListener - No element found");
      return;
    }
    e.preventDefault();
    contentChanged(element, inputElement.textContent);
  };
  for (const element2 of hoveredElements.values()) {
    element2.classList.remove("border");
    element2.classList.remove("border-red-800");
    element2.removeAttribute("contenteditable");
    element2.removeEventListener("focusout", focusOutListener);
    hoveredElements.delete(element2);
  }
  traversePage(page, (p, i) => {
    if (p._id === componentId) {
      const matchedElement = findElement(document.querySelector("main"), i, page);
      matchedElement.classList.add("border");
      matchedElement.classList.add("border-red-800");
      matchedElement.setAttribute("contenteditable", "true");
      matchedElement.addEventListener("focusout", focusOutListener);
      hoveredElements.add(matchedElement);
    }
  });
  setState({ componentId }, { element, parent: "selected" });
}
function elementChanged(element, value) {
  const { editor: { page }, selected: { componentId } } = getState(element);
  const nextPage = produceNextPage(page, componentId, (p, element2) => {
    element2?.replaceWith(changeTag(element2, value));
    p.element = value;
  });
  setState({ page: nextPage }, { element, parent: "editor" });
}
function changeTag(element, tag) {
  const newElem = document.createElement(tag);
  const clone = element.cloneNode(true);
  while (clone.firstChild) {
    newElem.appendChild(clone.firstChild);
  }
  for (const attr of clone.attributes) {
    newElem.setAttribute(attr.name, attr.value);
  }
  return newElem;
}
function contentChanged(element, value) {
  const { editor: { page }, selected: { componentId } } = getState(element);
  const nextPage = produceNextPage(page, componentId, (p, element2) => {
    if (element2) {
      element2.innerHTML = value;
    }
    p.children = value;
  });
  setState({ page: nextPage }, { element, parent: "editor" });
}
function classChanged(element, value) {
  const { editor: { page }, selected: { componentId } } = getState(element);
  const nextPage = produceNextPage(page, componentId, (p, element2) => {
    if (element2) {
      element2.setAttribute("class", value);
      element2.classList.add("border");
      element2.classList.add("border-red-800");
    }
    p.class = value;
  });
  setState({ page: nextPage }, { element, parent: "editor" });
}
function produceNextPage(page, componentId, matched) {
  return immer.produce(page, (draftPage) => {
    traversePage(draftPage, (p, i) => {
      if (p._id === componentId) {
        matched(p, findElement(document.querySelector("main"), i, page));
      }
    });
  });
}
function findElement(element, index, page) {
  let i = 0;
  function recurse(element2, page2) {
    if (!element2) {
      return null;
    }
    if (Array.isArray(page2)) {
      let elem = element2;
      for (const p of page2) {
        const match = recurse(elem, p);
        if (match) {
          return match;
        }
        elem = elem?.nextElementSibling;
      }
    } else {
      if (index === i) {
        return element2;
      }
      i++;
      if (Array.isArray(page2.children)) {
        const match = recurse(element2.firstElementChild, page2.children);
        if (match) {
          return match;
        }
      }
    }
    return null;
  }
  return recurse(element?.firstElementChild, page);
}
function getSelectedComponent(editorState, selectedState) {
  let match = {};
  const { componentId } = selectedState;
  traversePage(editorState.page, (p) => {
    if (p._id === componentId) {
      match = p;
    }
  });
  return match;
}
if (!("Deno" in globalThis)) {
  console.log("Hello from the page editor");
  window.createEditor = createEditor;
  window.toggleEditorVisibility = toggleEditorVisibility;
  window.metaChanged = metaChanged;
  window.classChanged = debounce(classChanged);
  window.elementClicked = elementClicked;
  window.elementChanged = elementChanged;
  window.contentChanged = debounce(contentChanged);
  window.getSelectedComponent = getSelectedComponent;
  window.updateFileSystem = updateFileSystem;
}
function debounce(func, timeout = 100) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}
