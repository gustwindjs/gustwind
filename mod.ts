import { Application } from "./deps.ts";

async function serve(port: number) {
  const app = new Application();

  console.log(`Serving at ${port}`);

  app.use((context) => {
    // TODO
    context.response.body = "hello";
  });

  await app.listen({ port });
}

// TODO: Make this configurable
const port = 3000;

serve(port);
