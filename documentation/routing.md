---
slug: 'routing'
title: 'Routing'
description: 'In Gustwind, routes are defined using configuration'
---

In Gustwind, routes are defined using configuration. The model favors explicity over implicity and it supports nesting. Thanks to nesting, you can implement features like i18n and generate a blog or pages to the site root as in the example below.

Routes define how project layouts are combined with data sources and what kind of metadata is injected to them. In short, they are glue of each site.

The example below shows how the structure of this site has been defined:

**routes.json**

[<file>](site/routes.json)

## Data sources

Each route can be connected to data sources through functions as defined below. The data sources are then visible at layouts and can be accessed through the templating context.

**dataSources.ts**

[<file>](site/dataSources.ts)

Data sources are asynchronous functions returning arrays of objects. Then, when bound, you can access the content. This would be a good spot to connect to a database, external API, or local data.
