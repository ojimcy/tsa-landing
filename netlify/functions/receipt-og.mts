// The 1080×1350 share image of a live receipt: /og/r/TSA-XXXXX-XXXXX.png. It is
// drawn from the API's public receipt, never from the URL, so nobody can make a
// TSA-branded receipt for a payment that wasn't made — and a code with no live
// receipt behind it gets no image at all, not a generic one.
//
// A (Node) function, not an edge function like pay-og: drawing 1080×1350 takes
// resvg hundreds of milliseconds of CPU, well past an edge function's budget.
// The CDN caches each versioned image, so it is drawn once per receipt state.
// Default imports: react and react-dom ship CommonJS (and the shared libs stay
// importable from Deno, where only a CommonJS module's default export exists).
import React from "react";
import ReactDOMServer from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import { RECEIPT_IMAGE_HEIGHT, RECEIPT_IMAGE_WIDTH, loadReceiptCard, parseReceiptPath, receiptImageUrl } from "../../src/lib/receipt-share.ts";
import { receiptSealSvg } from "../../src/lib/receipt-seal.ts";
import { pngResponse, renderPng, siteImage, type CardKit } from "../lib/og-render.ts";
import { RECEIPT_GOLD, RECEIPT_INK, receiptImage } from "../lib/receipt-image.ts";
import { payApiUrl } from "../lib/pay-api.ts";

// Both the same on every receipt: drawn or fetched once per instance.
const loadWatermark = siteImage("/og-assets/receipt-watermark.png");
let seal: string | undefined;
const sealImage = (raster: CardKit["raster"]) =>
  (seal ??= raster(receiptSealSvg({ ringId: "seal-ring", color: RECEIPT_GOLD, size: 320 })));

/** The receipt page's own QR component, as a standalone SVG document. */
function qrSvg(url: string): string {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(QRCodeSVG, { value: url, size: 188, level: "M", marginSize: 0, fgColor: RECEIPT_INK, bgColor: "#ffffff", xmlns: "http://www.w3.org/2000/svg" }),
  );
}

export default async function receiptOg(request: Request) {
  const url = new URL(request.url);
  const bare = parseReceiptPath(url.pathname.replace(/^\/og/, "").replace(/\.png$/, ""));
  if (!bare) return new Response("Not found", { status: 404 });

  const card = await loadReceiptCard(payApiUrl(), bare);
  // A code with no live receipt: briefly cached at the CDN, so a stream of made-up codes
  // can't each cost an API read (a receipt's own links appear only once it is paid).
  if (!card) return new Response("Not found", { status: 404, headers: { "cache-control": "no-store", "netlify-cdn-cache-control": "public, s-maxage=60" } });
  // Only the URL of the receipt as it is now gets drawn: a refund changes the
  // version, and any other ?v= is sent to the current one, so every render is cacheable.
  const canonical = receiptImageUrl(url.origin, bare, card);
  if (url.href !== canonical) return new Response(null, { status: 302, headers: { location: canonical, "cache-control": "no-store" } });

  const watermark = await loadWatermark(url.origin);
  const png = await renderPng(url.origin, RECEIPT_IMAGE_WIDTH, RECEIPT_IMAGE_HEIGHT, ({ logo, raster }) =>
    receiptImage(card, { logo, qrSvg: qrSvg(card.verifyUrl), seal: sealImage(raster), watermark }),
  );
  return pngResponse(png, 7 * 86_400);
}

export const config = { path: "/og/r/*" };
