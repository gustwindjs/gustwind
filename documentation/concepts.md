---
slug: 'concepts'
title: 'Concepts'
description: 'Gustwind comes with several key concepts'
---
You'll learn how different concepts of Gustwind go together on this page. It's self-similar in many ways and if you are familiar with technologies such as HTML, Tailwind, or React, likely you'll get used to it fast.

At its core, the page engine is an interpolating template interpreter that allows data binding. That means there's special syntax for connecting data with your pages and components. The data binding itself happens at [routing level](/routing/) and here we focus on the component and layout level.

## Components

To give you a simple example of a component, consider the following example for a link that is able to bold itself if it's matching to the path of the current page:

**components/SiteLink.html**

[<file>](site/components/SiteLink.html)

**components/SiteLink.server.ts**

[<file>](site/components/SiteLink.server.ts)

A navigation component built on top of `SiteLink` could look like this:

**components/Navigation.html**

[<file>](site/components/Navigation.html)

### Utilities

The following example illustrates the usage of utilities:

**layouts/blogIndex.html**

[<file>](site/layouts/blogIndex.html)

## Layouts

Gustwind layouts are technically components:

**layouts/siteIndex.html**

[<file>](site/layouts/siteIndex.html)

The same idea can be used to implement an RSS feed.

**layouts/rssPage.html**

[<file>](site/layouts/rssPage.html)

**layouts/rssPage.server.ts**

[<file>](site/layouts/rssPage.server.ts)

