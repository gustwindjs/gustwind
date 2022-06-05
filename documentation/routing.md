---
slug: 'routing'
title: 'Routing'
description: ''
---

In Gustwind, routes are defined using configuration. The model favors explicity over implicity and it supports nesting. Thanks to nesting, you can implement features like i18n and generate a blog or pages to the site root as in the example below.

Routes define how project layouts are combined with data sources and what kind of metadata is injected to them. In short, they are glue of each site.

The example below shows how the structure of this site has been defined:

**routes.json**

```json
{
  "/": {
    "meta": {
      "title": "Gustwind",
      "description": "Deno powered JSON oriented site generator"
    },
    "layout": "siteIndex",
    "dataSources": [
      {
        "id": "readme",
        "operation": "file",
        "==children": "utilities.markdown('./README.md').content"
      }
    ],
    "expand": {
      "dataSources": [
        {
          "id": "documentation",
          "operation": "indexMarkdown",
          "input": "./documentation"
        }
      ],
      "matchBy": {
        "dataSource": "documentation",
        "collection": "content",
        "slug": "data.slug"
      },
      "layout": "documentationPage",
      "meta": {
        "__title": "match.data.title",
        "__description": "match.data.description"
      }
    }
  },
  "blog": {
    "layout": "blogIndex",
    "meta": {
      "title": "Blog",
      "description": "A blog about Gustwind"
    },
    "dataSources": [
      {
        "id": "blogPosts",
        "operation": "indexMarkdown",
        "input": "./blogPosts"
      }
    ],
    "expand": {
      "dataSources": [
        {
          "id": "blogPosts",
          "operation": "indexMarkdown",
          "input": "./blogPosts"
        }
      ],
      "matchBy": {
        "dataSource": "blogPosts",
        "collection": "content",
        "slug": "data.slug"
      },
      "layout": "blogPage",
      "meta": {
        "__title": "match.name",
        "__description": "match.description"
      }
    }
  },
  "buttons": {
    "layout": "buttonsPage",
    "meta": {
      "title": "Gustwind buttons",
      "description": "Secret buttons page"
    },
    "routes": {
      "more": {
        "layout": "buttonsPage",
        "meta": {
          "title": "More Gustwind buttons",
          "description": "Another secret buttons page"
        }
      }
    }
  },
  "atom.xml": {
    "layout": "rssPage",
    "type": "xml",
    "meta": {
      "title": "Gustwind",
      "description": "Gustwind blog"
    },
    "dataSources": [
      {
        "id": "blogPosts",
        "operation": "indexMarkdown",
        "input": "./blogPosts"
      }
    ]
  }
}
```
