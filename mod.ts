import { Application, getStyleInjector, getStyleTag, ow } from "./deps.ts";

type Props = Record<string, string>;
type Component = {
  element: string; // TODO: Only valid DOM elements and components
  children?: string | Component[];
  class?: string | ((props?: Props) => string);
  props?: Props;
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

  // TODO: Separate this to another file and let it be adjustable through
  // the browser
  const document: Component = {
    element: "flex",
    class: "m-4",
    props: {
      direction: "row",
    },
    children: [
      {
        element: "box",
        class: "bg-blue-200 p-2",
        children: "Hello",
      },
      {
        element: "box",
        class: "bg-yellow-200 p-2",
        children: "world",
      },
    ],
  };

  app.use((context) => {
    try {
      const styleInjector = getStyleInjector();
      const body = render(document);
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

function render(component: Component): string {
  const foundComponent = components[component.element];
  const element = foundComponent ? foundComponent.element : component.element;

  return `<${element} class="${
    getClass(foundComponent.class, component.props)
  } ${getClass(component.class, component.props)}">${
    Array.isArray(component.children)
      ? component.children.map(render).join("")
      : component.children
  }</${element}>`;
}

function getClass(kls: Component["class"], props: Component["props"]) {
  if (typeof kls === "function") {
    return ow(kls(props));
  }

  return kls ? ow(kls) : "";
}

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
