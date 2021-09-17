import {
  Application,
  getStyleSheet,
  getStyleTag,
  readFileSync,
  tw,
} from "./deps.ts";
import * as components from "./components.ts";
import type { Attributes, Component } from "./components.ts";

type Meta = Record<string, string>;

async function serve(port: number) {
  const app = new Application();

  console.log(`Serving at ${port}`);

  const siteConfiguration = readFileSync("./site.json");
  const document: Component = JSON.parse(siteConfiguration);

  app.use((context) => {
    try {
      const stylesheet = getStyleSheet();
      const body = renderComponent({
        element: "main",
        children: [
          document,
          {
            element: "div",
            children: siteConfiguration,
          },
        ],
      });

      const styleTag = getStyleTag(stylesheet);

      context.response.headers.set("Content-Type", "text/html; charset=UTF-8");
      context.response.body = new TextEncoder().encode(
        htmlTemplate({ title: "Gustwind", head: styleTag, body }),
      );
    } catch (err) {
      console.error(err);

      context.response.body = new TextEncoder().encode(err.stack);
    }
  });

  await app.listen({ port });
}

function renderComponent(component: Component | string): string {
  if (typeof component === "string") {
    return component;
  }

  const foundComponent =
    (components as Record<string, Component>)[component.element];
  const element = component.as
    ? component.as
    : foundComponent
    ? foundComponent.element
    : component.element;
  const children = Array.isArray(component.children)
    ? component.children.map(renderComponent).join("")
    : component.children;

  return `<${element}${
    generateAttributes({
      ...(typeof component.attributes === "function"
        ? component.attributes(component.props)
        : component.attributes),
      class: getClasses(foundComponent, component),
    })
  }>${children}</${element}>`;
}

function generateAttributes(attributes: Attributes) {
  const ret = Object.entries(attributes).map(([k, v]) => v && `${k}="${v}"`)
    .filter(Boolean).join(
      " ",
    );

  return ret.length > 0 ? " " + ret : "";
}

function getClasses(baseComponent: Component, component: Component) {
  const baseClass = baseComponent &&
    getClass(baseComponent.class, component.props);
  const componentClass = getClass(component.class, component.props);

  return `${baseClass ? baseClass + " " : ""}${componentClass}`;
}

function getClass(kls: Component["class"], props: Component["props"]) {
  if (typeof kls === "function") {
    return tw(kls(props));
  }

  return kls ? tw(kls) : "";
}

// TODO: Extract script + link bits (too specific)
function htmlTemplate(
  { title, meta, head, body }: {
    title: string;
    meta?: Meta;
    head?: string;
    body?: string;
  },
) {
  return `<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title || ""}</title>
    <script type="text/javascript" src="https://unpkg.com/sidewind@3.2.1/dist/sidewind.umd.production.min.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/tailwindcss@2.0.1/dist/base.min.css" />
    ${generateMeta(meta)}
    ${head || ""}
  </head>
  <body>${body || ""}</body>
</html>`;
}

function generateMeta(meta?: Meta) {
  if (!meta) {
    return "";
  }

  return Object.entries(meta).map(([key, value]) =>
    `<meta name="${key}" content="${value}"></meta>`
  ).join("\n");
}

// TODO: Make this configurable
const port = 3000;

serve(port);
