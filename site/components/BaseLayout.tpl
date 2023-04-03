<html lang=${{ utility: "get", parameters: ["context", "language"] }}>
  <head>
    <MetaFields />
  </head>
  <body>
    <MainNavigation />
    <aside visibleIf=${[{
      "utility": "get",
      "parameters": ["props", "showToc"]
    }]} class="fixed top-16 pl-4 hidden lg:inline">
      <TableOfContents />
    </aside>
    <main children=${{
      "utility": "render",
      "parameters": [
        {
          "utility": "get",
          "parameters": ["props", "content"]
        }
      ]
    }} />
    <MainFooter />
    <Scripts />
  </body>
</html>
