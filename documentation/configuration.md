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
  "scripts": [
    {
      "type": "text/javascript",
      "src": "https://unpkg.com/sidewind@6.0.0/dist/sidewind.umd.production.min.js"
    }
  ],
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
    "extractCSS": true,
    "showEditorAlways": true
  }
}
```

Most of the configuration work happens at page level so make sure to [check the concepts page](/concepts/) to understand how they go together.
