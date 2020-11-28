import { Application, getStyleInjector, getStyleTag, ow } from "./deps.ts";

type Component = {
  element: string; // TODO: Only valid DOM elements
  children: string;
};
type Meta = Record<string, string>;

const box: Component = {
  element: "div",
  children: "hello world",
};

async function serve(port: number) {
  const app = new Application();

  console.log(`Serving at ${port}`);

  app.use((context) => {
    try {
      const styleInjector = getStyleInjector();
      const body = render(box);
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

function render(component: Component) {
  return `<${component.element} class="${
    ow("bg-red-200 p-2")
  }">${component.children}</${component.element}>`;
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
