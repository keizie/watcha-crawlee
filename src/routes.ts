import { createPlaywrightRouter } from "crawlee";
import routerComments from "./routes/comments.js";
import routerDecks from "./routes/decks.js";

export const router = createPlaywrightRouter();

router.addDefaultHandler(async ({ page, request, log }) => {
  log.info(`enqueueing new URLs`, { label: request.label, url: page.url() });
});

router.addHandler("mypage", async ({ enqueueLinks }) => {
  await enqueueLinks({
    label: "comments-types",
    globs: ["**/users/*/comments"],
  });
  await enqueueLinks({
    label: "collections-listing",
    globs: ["**/users/*/decks"],
  });
});

routerComments(router);
routerDecks(router);
