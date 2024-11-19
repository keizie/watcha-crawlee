import { CommonPage } from "crawlee";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { Page } from "playwright";

export const sanitize_filename = (path: string) => {
  return path.replace(/[^0-9a-zA-Zㄱ-ㅎㅏ-ㅣ가-힣]/gu, "");
};

// playwright/packages/playwright-core/src/utils/fileUtils.ts
async function mkdirIfNeeded(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true });
}
export const save_mhtml = (path: string, text: string) => {
  mkdirIfNeeded(path);
  writeFileSync(path, text, { encoding: "utf-8" });
};

export const page_save = async (page: Page) => {
  const slug = basename(page.url());
  const title = await page.title();
  const filename = `${slug}_${sanitize_filename(title)}`;

  // https://github.com/microsoft/playwright/issues/18645#issuecomment-1308020483
  // https://github.com/microsoft/playwright/issues/13629#issuecomment-1447679258
  const session = await page.context().newCDPSession(page);
  const doc = await session.send("Page.captureSnapshot", {
    format: "mhtml",
  });
  // https://gist.github.com/mezhgano/bd9fee908378ee87589b727906da55db
  save_mhtml(`saved/${filename}.mhtml`, doc.data);

  await page.screenshot({
    fullPage: true,
    path: `saved/${filename}.png`,
  });

  return { title };
};
