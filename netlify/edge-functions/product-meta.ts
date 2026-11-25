// Gives a shared listing (/p/:id) its own title, description and photo in place
// of the site-wide meta — chat apps read only the HTML. Mirrors pay-meta.ts.
import type { Config, Context } from "@netlify/edge-functions";
import { injectShareMeta, isLinkPreviewBot, metaTags } from "../../src/lib/pay-share.ts";
import { loadProductPreview, parseProductPath, productShareMeta } from "../../src/lib/product-share.ts";
import { payApiUrl } from "../lib/pay-api.ts";

const STALE_HEADERS = ["content-length", "content-encoding", "etag", "last-modified"];

export default async function productMeta(request: Request, context: Context) {
  if (!isLinkPreviewBot(request.headers.get("user-agent"))) return;

  const url = new URL(request.url);
  const id = parseProductPath(url.pathname);
  if (!id) return;
  const [page, product] = await Promise.all([context.next(), loadProductPreview(payApiUrl(), id)]);
  if (!product || page.status !== 200 || !page.headers.get("content-type")?.includes("text/html")) return page;

  const html = injectShareMeta(await page.text(), metaTags(productShareMeta(product, url.origin)));
  const headers = new Headers(page.headers);
  for (const h of STALE_HEADERS) headers.delete(h);
  return new Response(html, { status: 200, headers });
}

// A failure here must never cost a visitor the product page.
export const config: Config = { path: "/p/*", onError: "bypass" };
