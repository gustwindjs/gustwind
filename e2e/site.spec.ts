import { expect, test } from "@playwright/test";

test("homepage renders the hero, generated content, and primary navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Gustwind");
  await expect(page.getByRole("heading", { level: 1, name: /Gustwind/ })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Node.js-powered website creator" }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText(
    "component-oriented development of large-scale sites",
  );

  const navigation = page.locator("nav").first();
  await expect(navigation.getByRole("link", { name: "Modes" })).toHaveAttribute(
    "href",
    "/modes/",
  );
  await expect(navigation.getByRole("link", { name: "Blog" })).toHaveAttribute(
    "href",
    "/blog/",
  );
});

test("documentation route renders expanded markdown with sidebar actions", async ({ page }) => {
  await page.goto("/modes/");

  await expect(page).toHaveTitle("Modes");
  await expect(page.getByRole("heading", { level: 1, name: "Modes" })).toBeVisible();
  await expect(page.getByRole("main")).toContainText(
    "Gustwind implements two modes: development and production",
  );
  await expect(page.getByRole("link", { name: "Edit in GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/gustwindjs/gustwind/blob/develop/documentation/modes.md",
  );
  await expect(page.locator("nav").first().getByRole("link", { name: "Modes" })).toHaveClass(
    /font-bold/,
  );
});

test("blog index links to generated blog entries", async ({ page }) => {
  await page.goto("/blog/");

  const helloPost = page.getByRole("link", { name: "Hello" });
  await expect(helloPost).toHaveAttribute("href", "/blog/hello/");

  await helloPost.click();

  await expect(page).toHaveURL(/\/blog\/hello\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Hello" })).toBeVisible();
  await expect(page.getByRole("main")).toContainText(
    "This is a demonstration blog to test Gustwind's blog generation capabilities.",
  );
});

test("buttons page keeps its client-side button behavior", async ({ page }) => {
  await page.goto("/buttons/");

  await expect(page.getByText("You have discovered the secret button page!")).toBeVisible();
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toBe("You pressed button 1");
    await dialog.accept();
  });

  await page.getByText("Test button 1").click();
});

test("templating playground ships the browser compiler", async ({ page }) => {
  await page.goto("/templating/");

  await expect(page.getByRole("heading", { level: 1, name: "HTMLisp" })).toBeVisible();
  await expect(page.getByTestId("code-editor-input")).toBeVisible();
  await page.waitForFunction(() => typeof (window as Window & {
    compileHTML?: (input: string) => string;
  }).compileHTML === "function");

  const html = await page.evaluate(() =>
    (window as unknown as Window & {
      compileHTML: (input: string) => string;
    }).compileHTML(`<a class="rounded" &href="(concat / docs)">Docs</a>`)
  );

  expect(html).toContain('href="/docs"');
  expect(html).toContain(">Docs</a>");
});

test("templating playground applies typed Tailwind utilities in the preview", async ({ page }) => {
  await page.goto("/templating/");

  const input = page.getByTestId("code-editor-input");
  const previewLink = page.getByTestId("code-editor-preview").locator("a");

  await input.fill(`<a class="bg-red-400 pt-5 px-7 rounded-lg" &href="(concat / docs)">Docs</a>`);
  await expect(previewLink).toContainText("Docs");
  await expect(previewLink).toHaveCSS("padding-top", "20px");
  await expect(previewLink).toHaveCSS("padding-left", "28px");
  await expect.poll(async () =>
    previewLink.evaluate((node) => getComputedStyle(node).backgroundColor)
  ).not.toBe("rgba(0, 0, 0, 0)");
});
