// Outside the function folders so Netlify doesn't take it for a function: the 1080×1350
// share image of a live receipt (design A, "night card"), as a satori layout.
// Its words are the receipt page's; the QR comes in as SVG, the seal and the
// watermark as images.
import type { ReactElement } from "react";
import type { ReceiptCard } from "../../src/lib/receipt-share.ts";
import { h, img, svgImage } from "./og-render.ts";

export const RECEIPT_INK = "#1a2425";
export const RECEIPT_GOLD = "#E8A14A";
const INK = RECEIPT_INK;
const GOLD = RECEIPT_GOLD;
const MUTED = "#9fb1b2";
const SOFT = "#d5dcdc";
const LABEL = "#5b6b6c";
const RULE = "#eef1f1";
const PAID = "#7fd1a4";

const WATERMARK = "TSA CONNECT · TSA PAY · TSA CONNECT · TSA PAY · TSA CONNECT · TSA PAY · TSA CONNECT";

const check = (color: string, size: number) =>
  svgImage(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  );

function row(label: string, value: string, last: boolean, strong = false, pad = 18): ReactElement {
  return h(
    "div",
    { justifyContent: "space-between", alignItems: "center", gap: 32, padding: `${pad}px 0`, borderBottom: last ? "none" : `2px solid ${RULE}` },
    h("div", { fontSize: 26, fontWeight: 500, color: LABEL, flexShrink: 0 }, label),
    // A name with no spaces still wraps inside the card rather than running off it.
    h("div", { fontSize: strong ? 30 : 28, fontWeight: 700, letterSpacing: strong ? 2 : 0, textAlign: "right", minWidth: 0, wordBreak: "break-word" }, value),
  );
}

/** The amount's size: ₦1,010.11 at full size, ₦999,999,999.99 still inside the card. */
function amountSize(amount: string): number {
  if (amount.length > 15) return 72;
  if (amount.length > 12) return 92;
  return 124;
}

/**
 * The watermark: the brand repeated across the card, faint enough to read
 * through. ~1,100 rotated glyphs cost resvg seconds of CPU, far past an edge
 * function's budget, so it is never drawn per request: scripts/og-receipt-
 * watermark.mts renders this layer once into public/og-assets/receipt-watermark.png
 * (transparent), which the card places as an image. Re-run it after changing this.
 */
export function receiptWatermark(): ReactElement {
  return h(
    "div",
    { position: "relative", width: "100%", height: "100%", overflow: "hidden" },
    h(
      "div",
      { position: "absolute", left: -300, top: -200, width: 1700, height: 1800, flexDirection: "column", gap: 70, opacity: 0.03, transform: "rotate(-24deg)", color: "#ffffff", fontFamily: "Inter" },
      ...Array.from({ length: 14 }, (_, i) =>
        h("div", { whiteSpace: "nowrap", fontSize: 44, fontWeight: 700, letterSpacing: 14, marginLeft: (i % 2) * -220 }, WATERMARK),
      ),
    ),
  );
}

/** Art every receipt image places: `qrSvg` is a whole SVG document; the rest are image data: URIs. */
export type ReceiptArt = { logo: string; qrSvg: string; seal: string; watermark: string };

/**
 * What a receipt image shows, whatever it is a receipt for: the night card with
 * its brand line, status, amount, a white panel of rows, then the QR that
 * checks it. TSA Pay and bill receipts both draw through this, so they stay one design.
 */
export type ReceiptLayout = {
  /** Under "TSA Connect" in the header ("TSA Pay", "Bills"). */
  product: string;
  /** The gold pill top-right ("PAYMENT RECEIPT"). */
  badge: string;
  status: string;
  /** A chip beside the status ("Refunded"); absent when none. */
  chip?: string;
  amount: string;
  /** The line under the amount ("to Ada's Shop"). */
  subline: string;
  /** Label, value, strong (bold, letter-spaced: codes and tokens). */
  rows: [string, string, boolean?][];
  verifyUrl: string;
  footer: string;
};

export function receiptLayoutImage(layout: ReceiptLayout, art: ReceiptArt): ReactElement {
  const { logo, qrSvg, seal, watermark } = art;
  const { rows } = layout;
  const chip = layout.chip && h(
    "div",
    { marginLeft: 16, padding: "6px 16px", borderRadius: 999, background: "#3a4a4b", color: "#ffffff", fontSize: 22, fontWeight: 700 },
    layout.chip,
  );

  return h(
    "div",
    { position: "relative", flexDirection: "column", width: "100%", height: "100%", padding: "72px 80px", background: INK, color: "#ffffff", fontFamily: "Inter", overflow: "hidden" },
    img(watermark, 1080, 1350, { position: "absolute", left: 0, top: 0 }),
    h(
      "div",
      { alignItems: "center", justifyContent: "space-between" },
      h(
        "div",
        { alignItems: "center", gap: 18 },
        img(logo, 72, 72, { borderRadius: 18 }),
        h("div", { flexDirection: "column", gap: 4 }, h("div", { fontSize: 34, fontWeight: 700 }, "TSA Connect"), h("div", { fontSize: 22, fontWeight: 500, color: MUTED }, layout.product)),
      ),
      h("div", { padding: "10px 22px", borderRadius: 999, border: `2px solid ${GOLD}`, color: GOLD, fontSize: 22, fontWeight: 700, letterSpacing: 3 }, layout.badge),
    ),
    h(
      "div",
      { flexDirection: "column", gap: 14, marginTop: 40 },
      h(
        "div",
        { alignItems: "center" },
        h("div", { width: 44, height: 44, borderRadius: 22, background: "#2f8f5b", alignItems: "center", justifyContent: "center" }, img(check("#ffffff", 26), 26, 26)),
        h("div", { marginLeft: 14, fontSize: 30, fontWeight: 700, color: PAID }, layout.status),
        chip || null,
      ),
      h("div", { fontSize: amountSize(layout.amount), fontWeight: 700, letterSpacing: -2, lineHeight: 1 }, layout.amount),
      h("div", { fontSize: 30, fontWeight: 500, color: SOFT, wordBreak: "break-word" }, layout.subline),
    ),
    h(
      "div",
      { flexDirection: "column", marginTop: 40, padding: "18px 44px", borderRadius: 28, background: "#ffffff", color: INK },
      // Past seven rows (a token receipt) they tighten so the QR keeps its room.
      ...rows.map(([label, value, strong], i) => row(label, value, i === rows.length - 1, strong, rows.length > 7 ? 13 : 18)),
    ),
    h(
      "div",
      { marginTop: "auto", alignItems: "center", gap: 32 },
      h("div", { width: 212, height: 212, borderRadius: 20, background: "#ffffff", alignItems: "center", justifyContent: "center", flexShrink: 0 }, img(svgImage(qrSvg), 180, 180)),
      h(
        "div",
        { flexDirection: "column", gap: 10, flexGrow: 1, flexShrink: 1, minWidth: 0 },
        h("div", { fontSize: 30, fontWeight: 700 }, "Scan to check this receipt"),
        h("div", { fontSize: 22, fontWeight: 500, color: MUTED, lineHeight: 1.4 }, layout.verifyUrl.replace(/^https:\/\//, "")),
      ),
      img(seal, 160, 160, { flexShrink: 0 }),
    ),
    h(
      "div",
      { justifyContent: "space-between", marginTop: "auto", paddingTop: 22, borderTop: "2px solid #2c3a3b", fontSize: 20, fontWeight: 500, color: "#7d9091" },
      h("div", {}, layout.footer),
      h("div", {}, "tsaconnectworld.com"),
    ),
  );
}

/** A TSA Pay receipt's image. */
export function receiptImage(card: ReceiptCard, art: ReceiptArt): ReactElement {
  const rows: [string, string | undefined, boolean?][] = [
    ["Paid to", card.merchant],
    ["Account", card.account],
    [card.purpose?.label ?? "For", card.purpose?.text],
    ["Paid by", card.payer],
    ["Paid on", card.paidAt],
    ["Refunded", card.refundLine?.replace(/^(Partly refunded|Refunded in full) · /, "")],
    ["Payment code", card.code, true],
  ];
  return receiptLayoutImage(
    {
      product: "TSA Pay",
      badge: "PAYMENT RECEIPT",
      status: "Paid",
      chip: card.refund ? (card.refund === "full" ? "Refunded" : "Partly refunded") : undefined,
      amount: card.amount,
      subline: `to ${card.merchant}`,
      rows: rows.filter((r): r is [string, string, boolean?] => !!r[1]),
      verifyUrl: card.verifyUrl,
      footer: "Paid with TSA Pay",
    },
    art,
  );
}
