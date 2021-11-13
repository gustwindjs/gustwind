---
slug: 'configuration'
title: 'Configuration'
---
Each project built with Gustwind needs minimal configuration to describe where to find the assets, site name, and development port:

**meta.json**

```json
{
  "developmentPort": 3000,
  "amountOfBuildThreads": "cpuMax",
  "siteName": "Gustwind",
  "language": "en",
  "head": {
    "meta": [
      {
        "charset": "UTF-8",
        "name": "viewport",
        "content": "width=device-width, initial-scale=1.0"
      }
    ],
    "link": [
      {
        "rel": "icon",
        "href": "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐳</text></svg>"
      },
      {
        "rel": "stylesheet",
        "type": "text/css",
        "href": "https://cdn.jsdelivr.net/gh/highlightjs/highlight.js/src/styles/github.css"
      }
    ],
    "script": [
      {
        "type": "text/javascript",
        "src": "https://unpkg.com/sidewind@5.4.6/dist/sidewind.umd.production.min.js"
      }
    ]
  },
  "paths": {
    "assets": "./assets",
    "components": "./components",
    "dataSources": "./dataSources",
    "output": "./build",
    "pages": "./pages",
    "scripts": "./scripts",
    "transforms": "./transforms",
    "twindSetup": "./twindSetup.ts"
  },
  "features": {
    "loadTwindRuntime": false,
    "showEditorAlways": true
  }
}
```

Most of the configuration work happens at page level so make sure to [check the concepts page](/concepts/) to understand how they go together.
