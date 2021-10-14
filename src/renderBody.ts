import { renderComponent } from "./renderComponent.ts";
import type { Components, DataContext, Page } from "../types.ts";

function renderBody(
  page: Page,
  pageComponent: Page["page"],
  components: Components,
  pageData: DataContext,
  pathname: string,
) {
  return renderComponent(
    {
      children: Array.isArray(pageComponent) ? pageComponent : [pageComponent],
    },
    components,
    { ...pageData, pathname, page },
  );
}

export { renderBody };
