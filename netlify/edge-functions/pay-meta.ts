// Gives each shared /pay link its own title, description and card image, in
// place of the site-wide meta in index.html — chat apps read only the HTML.
import type { Config, Context } from "@netlify/edge-functions";
import { injectShareMeta, isLinkPreviewBot, loadPayCard, metaTags, shareMeta } from "../../src/lib/pay-share.ts";
import { payApiUrl } from "./lib/pay-api.ts";

// Headers of the static index.html that no longer describe the rewritten page.
const STALE_HEADERS = ["content-length", "content-encoding", "etag", "last-modified"];

export default async function payMeta(request: Request, context: Context) {
  // Payers get the page untouched: only a preview crawler waits on the API.
  if (!isLinkPreviewBot(request.headers.get("user-agent"))) return;

  const url = new URL(request.url);
  const [page, { card, payment }] = await Promise.all([context.next(), loadPayCard(payApiUrl(), url.pathname)]);
  if (page.status !== 200 || !page.headers.get("content-type")?.includes("text/html")) return page;

  const html = injectShareMeta(await page.text(), metaTags(shareMeta(card, url, payment)));
  const headers = new Headers(page.headers);
  for (const h of STALE_HEADERS) headers.delete(h);
  return new Response(html, { status: 200, headers });
}

// A failure here must never cost a payer the checkout page: Netlify serves it as if this didn't exist.
export const config: Config = { path: "/pay/*", onError: "bypass" };
