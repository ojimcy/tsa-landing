// Gives a shared bill receipt (/b/:code) its own title, description and image
// in place of the site-wide meta — chat apps read only the HTML. Mirrors
// receipt-meta.ts for TSA Pay receipts.
import type { Config, Context } from "@netlify/edge-functions";
import { injectShareMeta, isLinkPreviewBot, metaTags } from "../../src/lib/pay-share.ts";
import { billReceiptShareMeta, loadBillReceiptCard, parseBillReceiptPath } from "../../src/lib/bill-receipt-share.ts";
import { payApiUrl } from "../lib/pay-api.ts";

const STALE_HEADERS = ["content-length", "content-encoding", "etag", "last-modified"];

export default async function billReceiptMeta(request: Request, context: Context) {
  if (!isLinkPreviewBot(request.headers.get("user-agent"))) return;

  const url = new URL(request.url);
  const bare = parseBillReceiptPath(url.pathname);
  if (!bare) return;
  const [page, card] = await Promise.all([context.next(), loadBillReceiptCard(payApiUrl(), bare)]);
  if (!card || page.status !== 200 || !page.headers.get("content-type")?.includes("text/html")) return page;

  const html = injectShareMeta(await page.text(), metaTags(billReceiptShareMeta(card, url.origin, bare)));
  const headers = new Headers(page.headers);
  for (const h of STALE_HEADERS) headers.delete(h);
  return new Response(html, { status: 200, headers });
}

// A failure here must never cost anyone the receipt page.
export const config: Config = { path: "/b/*", onError: "bypass" };
