import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Page,
  type Worker,
} from "@playwright/test";
import { cp, mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { State } from "../src/model.ts";

let context: BrowserContext;
let worker: Worker;
let site: Page;
let panel: Page;
let tabId: number;
let directory: string;
let extensionId: string;
const errors: string[] = [];

async function state(): Promise<State> {
  return worker.evaluate(async (id) => chrome.tabs.sendMessage(id, { type: "GLANCE_GET" }), tabId);
}
async function scan() {
  await panel.getByRole("button", { name: "Scan again", exact: true }).click();
  await expect.poll(async () => (await state()).status).toBe("ready");
  await expect(panel.getByRole("button", { name: "Scan again", exact: true })).toBeEnabled();
}
async function auditPanel() {
  return panel.evaluate(async () => {
    const axe = (window as unknown as { axe: typeof import("axe-core") }).axe;
    return (
      await axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
      })
    ).violations.map((result) => ({
      id: result.id,
      nodes: result.nodes.map((node) => node.target),
    }));
  });
}

test.beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "a11y-glance-test-"));
  const extension = path.join(directory, "extension");
  await cp("dist", extension, { recursive: true });
  await cp("node_modules/axe-core/axe.min.js", path.join(extension, "axe-test.js"));
  const manifest = JSON.parse(await readFile(path.join(extension, "manifest.json"), "utf8"));
  // Test-only origin grant replaces the browser toolbar gesture that headless automation cannot perform.
  manifest.host_permissions = ["http://127.0.0.1/*"];
  await writeFile(path.join(extension, "manifest.json"), JSON.stringify(manifest));
  context = await chromium.launchPersistentContext(path.join(directory, "profile"), {
    channel: "chromium",
    headless: true,
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  worker = context.serviceWorkers()[0] || (await context.waitForEvent("serviceworker"));
  extensionId = worker.url().split("/")[2];
  site = await context.newPage();
  site.on("pageerror", (error) => errors.push(error.message));
  await site.goto("http://127.0.0.1:4318/?token=do-not-export#private");
  tabId = await worker.evaluate(
    async () => (await chrome.tabs.query({ url: "http://127.0.0.1/*" }))[0].id!,
  );
  await worker.evaluate(async (id) => {
    await chrome.scripting.executeScript({ target: { tabId: id }, files: ["content.js"] });
  }, tabId);
  panel = await context.newPage();
  panel.on("pageerror", (error) => errors.push(error.message));
  await panel.setViewportSize({ width: 380, height: 1000 });
  await panel.goto(`chrome-extension://${extensionId}/panel.html`);
  await worker.evaluate(async (id) => {
    await chrome.tabs.update(id, { active: true });
  }, tabId);
  await worker.evaluate(
    async (id) => chrome.tabs.sendMessage(id, { type: "GLANCE_ENABLE" }),
    tabId,
  );
  await expect.poll(async () => (await state()).status).toBe("ready");
  await expect(
    panel.getByRole("button", { name: "Download all issues", exact: false }),
  ).toBeVisible();
});

test.afterAll(async () => {
  await context?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

test("grouped findings, page markers, focused exports, stale state, and fresh scan", async () => {
  const initial = await state();
  expect(initial.stale).toBe(false);
  const checkbox = initial.report!.groups.find((group) => group.selector.includes("#updates"))!;
  expect(checkbox).toBeTruthy();
  expect(checkbox.findings.length).toBeGreaterThan(1);
  const downloadAll = panel.waitForEvent("download");
  await panel.getByRole("button", { name: "Download all issues", exact: false }).click();
  const all = await downloadAll;
  expect(all.suggestedFilename()).toMatch(/^a11y-glance-all-issues-.*\.md$/);
  const fullReport = await readFile((await all.path())!, "utf8");
  expect(fullReport).toContain("#updates");
  expect(fullReport).toContain("#email");
  expect(fullReport).not.toContain("do-not-export");

  await site.locator(`[data-a11y-glance] button[data-group-id="${checkbox.id}"]`).click();
  await expect(panel.getByRole("heading", { name: "Element details", exact: true })).toBeVisible();
  await expect(panel.locator(".finding")).toHaveCount(checkbox.findings.length);
  await expect(panel.locator(".detail-heading h2")).toBeFocused();
  const downloadOne = panel.waitForEvent("download");
  await panel.getByRole("button", { name: "Download this issue", exact: true }).first().click();
  const one = await readFile((await (await downloadOne).path())!, "utf8");
  expect(one).toContain("#updates");
  expect(one).not.toContain("#email");
  expect((one.match(/#### /g) || []).length).toBe(1);

  await panel.getByRole("button", { name: "All elements", exact: true }).click();
  await expect(panel.locator(`#row-${checkbox.id}`)).toBeFocused();
  await panel.getByRole("button", { name: "Hide page highlights", exact: true }).click();
  await expect(site.locator("[data-a11y-glance]")).toHaveCount(0);
  await panel.getByRole("button", { name: "Show page highlights", exact: true }).click();
  await expect(site.locator("[data-a11y-glance]")).toHaveCount(1);

  await site
    .locator("#updates")
    .evaluate((element) => element.setAttribute("aria-checked", "false"));
  await expect(panel.getByText("Page changed since this scan", { exact: true })).toBeVisible();
  await scan();
  expect(
    (await state())
      .report!.groups.find((group) => group.selector.includes("#updates"))!
      .findings.some((finding) => finding.rule === "aria-required-attr"),
  ).toBe(false);

  await site.locator("#email").evaluate((element) => element.remove());
  await expect(panel.getByText("Page changed since this scan", { exact: true })).toBeVisible();
  const removed = initial.report!.groups.find((group) => group.selector.includes("#email"))!;
  await panel.locator(`#row-${removed.id}`).click();
  await expect(panel.getByText(/This element cannot be located now/)).toBeVisible();
  await scan();
  expect((await state()).report!.groups.some((group) => group.selector.includes("#email"))).toBe(
    false,
  );
});

test("light/dark, narrow width, keyboard and the panel's own accessibility", async () => {
  // Restore the fixture and reconnect to the new document.
  await site.reload();
  await worker.evaluate(async (id) => {
    await chrome.scripting.executeScript({ target: { tabId: id }, files: ["content.js"] });
    await chrome.tabs.sendMessage(id, { type: "GLANCE_ENABLE" });
  }, tabId);
  await expect.poll(async () => (await state()).status).toBe("ready");
  await expect(
    panel.getByRole("button", { name: "Download all issues", exact: false }),
  ).toBeVisible();
  await panel.addScriptTag({ url: `chrome-extension://${extensionId}/axe-test.js` });
  await mkdir("docs/screenshots", { recursive: true });
  for (const colorScheme of ["light", "dark"] as const) {
    await panel.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    for (const width of [320, 380, 480]) {
      await panel.setViewportSize({ width, height: 1040 });
      await expect
        .poll(() => panel.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      if (width === 380)
        await panel.screenshot({
          path: `docs/screenshots/panel-${colorScheme}.png`,
          fullPage: true,
        });
    }
    expect(await auditPanel()).toEqual([]);
    await panel.locator(".element-row").first().click();
    expect(await auditPanel()).toEqual([]);
    await panel.getByRole("button", { name: "All elements", exact: true }).click();
  }
  await panel.setViewportSize({ width: 380, height: 1000 });
  await panel.locator(".element-row").first().focus();
  await panel.keyboard.press("Enter");
  await expect(panel.locator(".detail-heading h2")).toBeFocused();
  await panel.screenshot({ path: "docs/screenshots/detail-dark.png", fullPage: true });
  await panel.getByRole("button", { name: "All elements", exact: true }).click();
  await panel.evaluate(() => {
    document.documentElement.style.fontSize = "26px";
  });
  expect(await panel.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await panel.evaluate(() => {
    document.documentElement.style.removeProperty("font-size");
  });
  await panel.emulateMedia({ forcedColors: "active" });
  await panel.getByRole("button", { name: "Scan again", exact: true }).focus();
  await panel.keyboard.press("Tab");
  expect(
    await panel.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle),
  ).not.toBe("none");
  await panel.emulateMedia({ forcedColors: "none", colorScheme: "light" });
  await site.screenshot({ path: "docs/screenshots/page-markers.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("tab changes and navigation cannot reuse another document's results", async () => {
  const second = await context.newPage();
  await second.goto("http://127.0.0.1:4318/second");
  const secondId = await worker.evaluate(
    async () => (await chrome.tabs.query({ url: "http://127.0.0.1:4318/second" }))[0].id!,
  );
  await worker.evaluate(async (id) => {
    await chrome.tabs.update(id, { active: true });
  }, secondId);
  await expect(
    panel.getByRole("heading", { name: "Your next glance starts here", exact: true }),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Download all issues", exact: false }),
  ).toHaveCount(0);
  for (const colorScheme of ["light", "dark"] as const) {
    await panel.emulateMedia({ colorScheme });
    expect(await auditPanel()).toEqual([]);
  }
  await second.goto("chrome://version/");
  await expect(
    panel.getByRole("button", { name: "Download all issues", exact: false }),
  ).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Scan this page", exact: true })).toBeDisabled();
  await second.close();
  expect(errors).toEqual([]);
});
