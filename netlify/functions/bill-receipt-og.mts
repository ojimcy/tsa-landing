// The 1080×1350 share image of a delivered bill: /og/b/TSA-XXXXX-XXXXX.png. Same
// night card as a TSA Pay receipt (receipt-og.mts), drawn from the API's public
// bill receipt, never from the URL; a code with no receipt gets no image at all.
import React from "react";
import ReactDOMServer from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import { loadBillReceiptCard, billReceiptImageUrl, parseBillReceiptPath } from "../../src/lib/bill-receipt-share.ts";
import { RECEIPT_IMAGE_HEIGHT, RECEIPT_IMAGE_WIDTH } from "../../src/lib/receipt-share.ts";
import { receiptSealSvg } from "../../src/lib/receipt-seal.ts";
import { pngResponse, renderPng, siteImage, type CardKit } from "../lib/og-render.ts";
import { RECEIPT_GOLD, RECEIPT_INK, receiptLayoutImage } from "../lib/receipt-image.ts";
import { payApiUrl } from "../lib/pay-api.ts";

const loadWatermark = siteImage("/og-assets/receipt-watermark.png");
let seal: string | undefined;
const sealImage = (raster: CardKit["raster"]) =>
  (seal ??= raster(receiptSealSvg({ ringId: "seal-ring", color: RECEIPT_GOLD, size: 320 })));

function qrSvg(url: string): string {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(QRCodeSVG, { value: url, size: 188, level: "M", marginSize: 0, fgColor: RECEIPT_INK, bgColor: "#ffffff", xmlns: "http://www.w3.org/2000/svg" }),
  );
}

export default async function billReceiptOg(request: Request) {
  const url = new URL(request.url);
  const bare = parseBillReceiptPath(url.pathname.replace(/^\/og/, "").replace(/\.png$/, ""));
  if (!bare) return new Response("Not found", { status: 404 });

  const card = await loadBillReceiptCard(payApiUrl(), bare);
  if (!card) return new Response("Not found", { status: 404, headers: { "cache-control": "no-store", "netlify-cdn-cache-control": "public, s-maxage=60" } });
  const canonical = billReceiptImageUrl(url.origin, bare, card);
  if (url.href !== canonical) return new Response(null, { status: 302, headers: { location: canonical, "cache-control": "no-store" } });

  const watermark = await loadWatermark(url.origin);
  const png = await renderPng(url.origin, RECEIPT_IMAGE_WIDTH, RECEIPT_IMAGE_HEIGHT, ({ logo, raster }) =>
    receiptLayoutImage(
      {
        product: "Bills",
        badge: "BILL RECEIPT",
        status: "Delivered",
        amount: card.amount,
        subline: card.subline,
        rows: card.rows,
        verifyUrl: card.verifyUrl,
        footer: "Paid with TSA Connect",
      },
      { logo, qrSvg: qrSvg(card.verifyUrl), seal: sealImage(raster), watermark },
    ),
  );
  return pngResponse(png, 7 * 86_400);
}

export const config = { path: "/og/b/*" };
