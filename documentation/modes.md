---
slug: 'modes'
title: 'Modes'
description: 'Gustwind implements development and production modes'
---
Gustwind implements two modes: `development` and `production`. The idea of the `development` mode is to allow rapid development of your site while the `production` mode emits the site content in a static HTML to upload to a static file server to host.

## Development mode

The development mode of Gustwind has been implemented in a lazy manner. This means the server will boot fast and perform rendering only on request.

The preferred development path is the Node/Vite server through `npm run dev` or `gustwind-node --develop`.

## Production mode

In the production mode, the tool generates HTML at the `./build` directory. The preferred local path is `npm run build` or `gustwind-node --build`, while `npm run build:release` generates the additional Pagefind search index intended for deployment. Compared to the development mode, anything development related is removed from the output.

During tests against a large site with over 2000 pages, the build was completed in a few seconds and so far the performance seems promising although it can be still improved and not a lot of thought has been given to it.

If you have to perform a lot of processing on your data, it's recommended to push it to a third-party API (i.e. a GraphQL) and handle it there. That said, Gustwind lets you do all the processing while its running but that will come with a performance cost unless you cache the processing.
