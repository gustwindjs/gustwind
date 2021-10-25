# Configuration

Each project built with Gustwind needs minimal configuration to describe where to find the assets, site name, and development port:

**meta.json**

```json
{
  "developmentPort": 3000,
  "siteName": "Gustwind",
  "paths": {
    "components": "./components",
    "output": "./build",
    "pages": "./pages",
    "scripts": "./scripts",
    "transforms": "./transforms"
  },
  "browserDependencies": [
    "immer",
    "sidewind",
    "style-vendorizer",
    "twind",
    "twind-colors",
    "twind-sheets",
    "twind-shim",
    "twind-typography",
    "uuid"
  ]
}
```

Most of the configuration work happens at page level so make sure to [check the concepts page](/concepts/) to understand how they go together.
