// Run against a disposable local application. Requires Playwright and an installed Chrome.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const base = process.env.QONAQ_UI_TEST_BASE_URL;
if (!base)
  throw new Error(
    "Set QONAQ_UI_TEST_BASE_URL to a disposable local application.",
  );
const readyDeadline = Date.now() + 45000;
while (true) {
  try {
    const response = await fetch(base + "/api/package-options");
    if (response.ok) break;
  } catch {}
  if (Date.now() > readyDeadline)
    throw new Error("Application startup timeout");
  await new Promise((resolve) => setTimeout(resolve, 200));
}
const modulePath = process.env.QONAQ_PLAYWRIGHT_MODULE;
const { chromium } = await import(
  modulePath ? pathToFileURL(resolve(modulePath)).href : "playwright"
);
const output = resolve(
  process.env.QONAQ_UI_ARTIFACT_DIR || ".tools/planning-ui",
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const checks = [];
const pass = (name) => {
  checks.push(name);
  console.log("PASS: " + name);
};
try {
  await page.goto(base);
  await page
    .getByRole("button", { name: "Пропустить демо", exact: true })
    .click();
  await page.getByLabel("Имя", { exact: true }).fill("Дастан · проверка");
  await page
    .getByLabel("Почта", { exact: true })
    .fill(`planning-ui-${Date.now()}@example.test`);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill("Planning-ui-test-9876");
  await page
    .getByRole("button", { name: "Зарегистрироваться", exact: true })
    .click();
  const day = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  await page
    .getByLabel("Описание мероприятия")
    .fill(`Корпоратив на 80 гостей, бюджет 2,5 млн, ${day}, экономно`);
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.locator('input[name="guests"]').waitFor();
  assert.equal(await page.locator('input[name="guests"]').inputValue(), "80");
  assert.equal(
    await page.locator('input[name="budget"]').inputValue(),
    "2500000",
  );
  assert.equal(await page.locator('input[name="date"]').inputValue(), day);
  await page.locator('input[name="title"]').fill("Встреча команды");
  await page.locator('input[name="guests"]').fill("90");
  pass("description suggestions are editable");
  await page.locator('.planner button[type="submit"]').click();
  await page.locator(".venue-card .card-button").first().click();
  const configuration = page.getByRole("dialog", {
    name: "Пакет, смета и бронирование",
    exact: true,
  });
  await configuration
    .getByRole("button", { name: "Рассчитать смету", exact: true })
    .click();
  await configuration
    .getByRole("button", { name: "Сохранить смету", exact: true })
    .click();
  await configuration.locator("[data-saved-revision]").waitFor();
  await configuration
    .getByRole("button", { name: "Подготовить предложение", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Предложение для мероприятия",
    exact: true,
  });
  const body = editor.locator('textarea[name="proposal-body"]');
  await body.waitFor();
  assert.match(await body.inputValue(), /ПЛОЩАДКА/);
  assert.match(await body.inputValue(), /Гостей: 90/);
  await editor
    .locator('input[name="proposal-title"]')
    .fill("Предложение для команды");
  await body.fill(
    (await body.inputValue()) + "\n\nДополнение: встреча отдела разработки.",
  );
  await editor
    .getByRole("button", { name: "Сохранить предложение", exact: true })
    .click();
  await editor
    .getByText("Предложение сохранено в личном кабинете.", { exact: true })
    .waitFor();
  await page.screenshot({
    path: resolve(output, "proposal-desktop.png"),
    fullPage: true,
  });
  await editor.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page
    .getByRole("button", { name: "Личный кабинет", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Предложение для команды", exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: "Личный кабинет", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Открыть и редактировать", exact: true })
    .click();
  await body.waitFor();
  assert.match(
    await body.inputValue(),
    /Дополнение: встреча отдела разработки/,
  );
  await editor.getByRole("button", { name: "Закрыть", exact: true }).click();
  pass("proposal saves and reopens with edited text after reload");
  await page.screenshot({
    path: resolve(output, "dashboard-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Тарифы", exact: true }).click();
  await page
    .getByRole("button", { name: "Выбрать Pro (DEMO)", exact: true })
    .click();
  await page.getByText("Тариф Pro · DEMO", { exact: true }).waitFor();
  await page.screenshot({
    path: resolve(output, "plans-desktop.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Личный кабинет", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать TXT", exact: true }).click();
  const file = await download;
  assert.match(file.suggestedFilename(), /QonaqAI-proposal-\d+\.txt/);
  await file.saveAs(resolve(output, "proposal.txt"));
  pass("demo Pro selection and actual TXT download");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: resolve(output, "dashboard-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "mobile page must not overflow horizontally",
  );
  for (const name of [
    "Планирование",
    "Мои мероприятия",
    "Личный кабинет",
    "Тарифы",
  ]) {
    const button = page.getByRole("button", {
      name: name === "Мои мероприятия" ? /^Мои мероприятия/ : name,
      exact: name !== "Мои мероприятия",
    });
    await button.scrollIntoViewIfNeeded();
    assert.equal(await button.isVisible(), true);
  }
  pass("mobile dashboard and all navigation entries remain accessible");
  assert.deepEqual(
    errors,
    [],
    "browser must not report uncaught JavaScript errors",
  );
  pass("no uncaught browser errors");
} catch (error) {
  await page.screenshot({
    path: resolve(output, "failure.png"),
    fullPage: true,
  });
  await writeFile(resolve(output, "failure.txt"), String(error.stack));
  throw error;
} finally {
  await writeFile(
    resolve(output, "results.json"),
    JSON.stringify({ checks, errors }, null, 2),
  );
  await browser.close();
}
