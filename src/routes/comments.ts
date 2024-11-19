import { PlaywrightCrawlingContext, RouterHandler } from "crawlee";
import { page_save, sanitize_filename, save_mhtml } from "../utils.js";

export default (router: RouterHandler<PlaywrightCrawlingContext>) => {
  router.addHandler("comments-types", async ({ request, enqueueLinks }) => {
    await enqueueLinks({
      label: "comment-listing",
      urls: [
        // 카테고리 탭이 링크가 아니라 버튼 형태로 되어 있어서 복잡한 구현 대신 직접 URL 패턴을 추가
        `${request.url}?content_type=movies`,
        `${request.url}?content_type=tv_seasons`,
        `${request.url}?content_type=books`,
        `${request.url}?content_type=webtoons`,
      ],
    });
  });

  router.addHandler(
    "comment-listing",
    async ({ page, log, infiniteScroll, enqueueLinks }) => {
      let bottomCount = 0;
      page.on("request", (req) => {
        const type = req.resourceType();
        if (["xhr", "fetch"].includes(type)) {
          if (req.url().includes("/comments")) {
            bottomCount = 0;
            log.info("bottomCount reset to 0", { url: req.url() });
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
          if (bottomCount < 5) {
            await infiniteScroll(infiniteConfig);
          } else {
            log.info(`bottomCount reach to ${bottomCount}. Ends now.`);

            await enqueueLinks({
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

  router.addHandler(
    "comments.temp_disabled",
    async ({ request, page, log, pushData }) => {
      const { title } = await page_save(page);
      log.info(`${title}`, { url: request.loadedUrl });

      await pushData(
        {
          url: request.loadedUrl,
          title,
        },
        "comments"
      );
    }
  );
};
