// Gives a shared receipt (/r/:code) its own title, description and receipt
// image in place of the site-wide meta in index.html — chat apps read only the
// HTML. pay-meta.ts does the same for /pay links.
import type { Config, Context } from "@netlify/edge-functions";
import { injectShareMeta, isLinkPreviewBot, metaTags } from "../../src/lib/pay-share.ts";
import { loadReceiptCard, parseReceiptPath, receiptShareMeta } from "../../src/lib/receipt-share.ts";
import { payApiUrl } from "../lib/pay-api.ts";

// Headers of the static index.html that no longer describe the rewritten page.
const STALE_HEADERS = ["content-length", "content-encoding", "etag", "last-modified"];

export default async function receiptMeta(request: Request, context: Context) {
  // Visitors get the page untouched: only a preview crawler waits on the API.
  if (!isLinkPreviewBot(request.headers.get("user-agent"))) return;

  const url = new URL(request.url);
  const bare = parseReceiptPath(url.pathname);
  if (!bare) return;
  const [page, card] = await Promise.all([context.next(), loadReceiptCard(payApiUrl(), bare)]);
  // No live receipt behind it: the site-wide meta, never a receipt-looking preview.
  if (!card || page.status !== 200 || !page.headers.get("content-type")?.includes("text/html")) return page;

  const html = injectShareMeta(await page.text(), metaTags(receiptShareMeta(card, url.origin, bare)));
  const headers = new Headers(page.headers);
  for (const h of STALE_HEADERS) headers.delete(h);
  return new Response(html, { status: 200, headers });
}

// A failure here must never cost anyone the receipt page: Netlify serves it as if this didn't exist.
export const config: Config = { path: "/r/*", onError: "bypass" };
