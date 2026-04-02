export function renderDashboardTitle(name: string, summaryHtml: string) {
  const plainTypeScriptText = `This should stay plain TypeScript: ${name}`;

  const template = `<section &attrs="sectionAttrs">
    <h1 &children="title"></h1>
    <fragment &visibleIf="hasSubtitle">
      <p &children="subtitle"></p>
    </fragment>
    <ul &foreach="actions as action">
      <li>
        <a &attrs="action.attrs" &href="action.href" &children="action.label"></a>
      </li>
    </ul>
    <div &children="(raw summaryHtml)"></div>
  </section>`;

  return renderView(template, {
    sectionAttrs: { class: "rounded-xl", "data-name": name },
    title: `Dashboard for ${name}`,
    hasSubtitle: true,
    subtitle: plainTypeScriptText,
    actions: [
      {
        href: "/overview",
        label: "Overview",
        attrs: { class: "font-medium", rel: "bookmark" }
      }
    ],
    summaryHtml,
  });
}

export function renderInline(content: string) {
  return renderView(
    `<article &class="cardClass">
      <slot name="content">
        <fragment &children="content"></fragment>
      </slot>
    </article>`,
    {
      cardClass: "bg-white",
      content,
    },
  );
}
