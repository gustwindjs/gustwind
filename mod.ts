import {
  Application,
  getStyleInjector,
  getStyleTag,
  ow,
  readFileSync,
} from "./deps.ts";

type Props = Record<string, string>;
type Component = {
  element: string; // TODO: Only valid DOM elements and components
  as?: string; // TODO: Only valid DOM elements
  children?: string | Component[];
  class?: string | ((props?: Props) => string);
  props?: Props;
  attributes?: Record<string, string>;
};
type Meta = Record<string, string>;

const box: Component = {
  element: "div",
};

const flex: Component = {
  element: "box",
  class: (props) =>
    `flex flex-${props?.direction === "column" ? "col" : "row"}`,
};

const components: Record<string, Component> = { box, flex };

async function serve(port: number) {
  const app = new Application();

  console.log(`Serving at ${port}`);

  const siteConfiguration = readFileSync("./site.json");
  const document: Component = JSON.parse(siteConfiguration);

  app.use((context) => {
    try {
      const styleInjector = getStyleInjector();
      const body = renderComponent({
        element: "main",
        children: [
          transformToExplorer(document),
          document,
          {
            element: "div",
            children: siteConfiguration,
          },
        ],
      });
      const styleTag = getStyleTag(styleInjector);

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

function transformToExplorer(component: Component): Component {
  const childrenWrapper: Component = {
    element: "ul",
    children: Array.isArray(component.children)
      ? component.children.map((c) => ({
        element: "li",
        children: [transformToExplorer(c)],
      }))
      : component.children,
  };

  return {
    element: "box",
    children: [{
      element: "box",
      children: component.element,
    }, childrenWrapper],
  };
}

function renderComponent(component: Component | string): string {
  if (typeof component === "string") {
    return component;
  }

  const foundComponent = components[component.element];
  const element = component.as
    ? component.as
    : foundComponent
    ? foundComponent.element
    : component.element;
  const children = Array.isArray(component.children)
    ? component.children.map(renderComponent).join("")
    : component.children;

  return `<${element} class="${foundComponent &&
    getClass(foundComponent.class, component.props)} ${
    getClass(component.class, component.props)
  }">${children}</${element}>`;
}

function getClass(kls: Component["class"], props: Component["props"]) {
  if (typeof kls === "function") {
    return ow(kls(props));
  }

  return kls ? ow(kls) : "";
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
