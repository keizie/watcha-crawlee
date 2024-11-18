import { PlaywrightCrawler } from "crawlee";
import { config } from "dotenv";

import { router } from "./routes.js";

config();
const startUrls = process.env.URLS?.split(" ") ?? [];

const crawler = new PlaywrightCrawler({
  headless: process.env.HEADFUL ? false : true,
  // log: new Log({ level: LogLevel.DEBUG }),
  maxConcurrency: 1,
  sameDomainDelaySecs: 2,
  // maxRequestsPerCrawl: 30, // Comment this option to scrape the full website.
  requestHandlerTimeoutSecs: 2000000,
  maxRequestRetries: 0,
  preNavigationHooks: [
    // https://crawlee.dev/api/playwright-crawler/interface/PlaywrightCrawlingContext#blockRequests
    async ({ blockRequests }) => {
      await blockRequests({
        urlPatterns: [
          "www.googletagmanager.com",
          "sentry.io",
          "/clipboard.min.js",
          "/api/users/me",
          "/api/ratings",
          "/api/legals",
          "/api/home/bottom_pop_up",
          "/api/sessions/region",
        ],
      });
    },
    // https://github.com/apify/crawlee/discussions/1814#discussioncomment-5212734
    async ({ page, log }) => {
      await page.route("**/*", (route) => {
        const req = route.request();
        if (["image", "media", "font", "other"].includes(req.resourceType())) {
          route.abort();
        } else {
          log.info(
            `Captured request: ${req.url()} to resource type: ${req.resourceType()}`
          );
          route.continue();
        }
      });
    },
    async ({ page }, gotoOptions = {}) => {
      await page.context().addCookies([
        {
          name: "Watcha-Web-Client-Language",
          value: "ko",
          domain: ".watcha.com",
          path: "/",
        },
        {
          name: "Watcha-Web-Client-Region",
          value: "KR",
          domain: ".watcha.com",
          path: "/",
        },
      ]);
      gotoOptions.waitUntil = "networkidle"; // domcontentloaded happens before comments API call
    },
  ],
  requestHandler: router,
});

await crawler.addRequests(
  startUrls.map((url) => ({
    url,
    label: "comment-listing",
  }))
);

await crawler.run();
