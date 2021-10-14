# Modes

Gustwind implements two modes: `development` and `production`. The idea of the `development` mode is to allow rapid development of your site while the `production` mode emits the site content in a static HTML to upload to a static file server to host.

## Development mode

The development mode of Gustwind has been implemented in a lazy manner. This means the server will boot fast and perform rendering only on request. The development server maintains a web socket connection to the clients and then keeps their state up to date based on your modifications.

The development mode is available through `vr start`. After running, you should head to `localhost:3000` in the browser. It's connected to detect changes to the server file (`src/serve.ts`) and to JSON files of the project. It then communicates the changes through a web socket to the frontend that's then able to update its state to match the current.

There's a small, built-in JSON editor on the browser side that's synchronized with your file system. The idea is to allow development directly in the browser and this can be useful for tuning styling of your pages for example.

The editor is available through the "Show editor" button at the bottom right corner of the window. The current implementation is based on [josdejong/jsoneditor](https://github.com/josdejong/jsoneditor) but this may be changed if a better alternative is found.

## Production mode

In the production mode (`vr build`), the tool generates HTML at the `./build` directory. Compared to the development mode, anything development related is removed from the output. At the moment no other optimizations are performed.

During tests against a large site with over 2000 pages, the build was completed in a few seconds and so far the performance seems promising although it can be still improved and not a lot of thought has been given to it.

If you have to perform a lot of processing on your data, it's recommended to push it to a third-party API (i.e. a GraphQL) and handle it there. That said, Gustwind lets you do all the processing while its running but that will come with a performance cost unless you cache the processing.
