import { createPlaywrightRouter, EnqueueStrategy, LogLevel } from "crawlee";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

export const router = createPlaywrightRouter();

router.addDefaultHandler(async ({ page, request, log }) => {
  log.info(`enqueueing new URLs`, { label: request.label, url: page.url() });
});

router.addHandler(
  "comment-listing",
  async ({ page, log, enqueueLinks, infiniteScroll }) => {
    let bottomCount = 0;
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["xhr", "fetch"].includes(type)) {
        if (req.url().includes("/comments")) {
          bottomCount = 0;
          log.info(`bottomCount reset to 0: ${req.url()}`);
        }
      }
    });

    await page.waitForLoadState("networkidle");
    const infiniteConfig = {
      timeoutSecs: 2,
      waitForSecs: 4,
      stopScrollCallback: async () => {
        log.debug(
          `infiniteScroll::stopScrollCallback triggered at ${Date.now()}`
        );
        // setInterval과 while을 통한 구현 자체로는 한번만 실행하면 될 것 같아 보이지만 타임아웃을 아주 길게 잡아도 도중에 멈추는 경우가 종종 있음.
        // https://github.com/apify/crawlee/blob/008bff80871cc55850b9a9b6413c9bdaf690c436/packages/playwright-crawler/src/internals/utils/playwright-utils.ts#L396
        // 대신 한번 무한 스크롤이 멈추면 return true로 항상 기존 호출은 멈추고 새로 시작하는 구조로 변경하고, 추가 호출이 일어나지 않은 상태가 계속되면 완전히 중단하도록 처리.
        bottomCount++;
        log.info(`bottomCount set to ${bottomCount}: ${page.url()}`);
        if (bottomCount < 10) {
          await infiniteScroll(infiniteConfig);
        } else {
          log.info(`bottomCount reach to ${bottomCount}. Ends now.`);

          await enqueueLinks({
            strategy: EnqueueStrategy.SameDomain,
            globs: ["**/comments/*"],
            label: "comments",
          });
        }
        return true; // stops the scrolling process if it returns `true`
      },
    };
    await infiniteScroll(infiniteConfig);
  }
);

// router.addHandler("comments", async ({ request, page, log, pushData }) => {
//   const slug = basename(request.loadedUrl);
//   const title = await page.title();
//   const filename = `${slug}_${sanitize_filename(title)}`;
//   log.info(`${title}`, { url: request.loadedUrl });

//   // https://github.com/microsoft/playwright/issues/18645#issuecomment-1308020483
//   // https://github.com/microsoft/playwright/issues/13629#issuecomment-1447679258
//   const session = await page.context().newCDPSession(page);
//   const doc = await session.send("Page.captureSnapshot", { format: "mhtml" });
//   // https://gist.github.com/mezhgano/bd9fee908378ee87589b727906da55db
//   save_mhtml(`saved/${filename}.mhtml`, doc.data);

//   await page.screenshot({
//     fullPage: true,
//     path: `saved/${filename}.png`,
//   });

//   await pushData(
//     {
//       url: request.loadedUrl,
//       title,
//     },
//     "comments"
//   );
// });

const sanitize_filename = (path: string) => {
  return path.replace(/[^0-9a-zA-Zㄱ-ㅎㅏ-ㅣ가-힣]/gu, "");
};

// playwright/packages/playwright-core/src/utils/fileUtils.ts
async function mkdirIfNeeded(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true });
}

const save_mhtml = (path: string, text: string) => {
  mkdirIfNeeded(path);
  writeFileSync(path, text, { encoding: "utf-8" });
};
