// A shared receipt (tsaconnectworld.com/r/<code>) as a chat preview and as an
// image: what the 1080×1350 receipt image shows, its URL, and the page's meta.
// Like pay-share.ts it is drawn from the API's public receipt only — never from
// the URL — so nobody can make a TSA-branded receipt for a payment that wasn't
// made. The API answers only for a succeeded LIVE payment.
// Only relative .ts imports, so the edge functions (Deno) can load this file.
import {
  formatKobo,
  formatLagosDateTime,
  formatPayCode,
  normalizePayCode,
  receiptRefundLine,
  type PublicReceipt,
} from "./pay-core.ts";
import { cardVersion, clip, getPublic, type ShareMeta } from "./pay-share.ts";

// site.domain (src/data/content.ts), which Deno can't load: the QR and the
// shared link always name the real site, never the host a preview was built on.
export const SITE_ORIGIN = "https://tsaconnectworld.com";

export const RECEIPT_IMAGE_WIDTH = 1080;
export const RECEIPT_IMAGE_HEIGHT = 1350;

/** What the receipt image shows: the receipt page's rows, nothing more. */
export type ReceiptCard = {
  code: string;
  merchant: string;
  amount: string;
  /** "For" or "Customer's note", with its words; absent when there are none. */
  purpose?: { label: string; text: string };
  payer?: string;
  paidAt?: string;
  refund?: "partial" | "full";
  refundLine?: string;
  verifyUrl: string;
};

/** The bare code a /r/:code path names, or null for anything else. */
export function parseReceiptPath(pathname: string): string | null {
  const m = /^\/r\/([^/]+)\/?$/.exec(pathname);
  if (!m) return null;
  let raw: string;
  try {
    raw = decodeURIComponent(m[1]);
  } catch {
    return null;
  }
  return normalizePayCode(raw);
}

/** The canonical public page a receipt's QR opens. */
export function receiptPageUrl(bare: string): string {
  return `${SITE_ORIGIN}/r/${formatPayCode(bare)}`;
}

export function receiptCard(r: PublicReceipt, verifyUrl: string): ReceiptCard {
  const text = clip(r.description?.trim(), 60);
  return {
    code: r.code,
    merchant: clip(r.merchantName, 40) ?? "",
    amount: formatKobo(r.amount),
    purpose: text ? { label: r.descriptionIsCustomerNote ? "Customer's note" : "For", text } : undefined,
    payer: r.payerInitials || undefined,
    paidAt: formatLagosDateTime(r.paidAt) ?? undefined,
    refund: r.refundStatus === "none" ? undefined : r.refundStatus,
    refundLine: receiptRefundLine(r) ?? undefined,
    verifyUrl,
  };
}

/** The receipt image, e.g. /og/r/TSA-8D4DQ-Y4DMN.png?v=…; the version moves when a refund changes it. */
export function receiptImageUrl(origin: string, bare: string, card: ReceiptCard): string {
  return `${origin}/og/r/${formatPayCode(bare)}.png?v=${cardVersion(card)}`;
}

/** The meta for /r/:code; `origin` serves the image (this deploy's own edge function). */
export function receiptShareMeta(card: ReceiptCard, origin: string, bare: string): ShareMeta {
  const description = [card.paidAt && `Paid ${card.paidAt}`, card.code, card.refundLine, "Verified by TSA Connect"].filter(Boolean).join(" · ");
  return {
    title: `Receipt: ${card.amount} to ${card.merchant}`,
    description,
    url: receiptPageUrl(bare),
    image: receiptImageUrl(origin, bare, card),
    imageWidth: RECEIPT_IMAGE_WIDTH,
    imageHeight: RECEIPT_IMAGE_HEIGHT,
  };
}

/** The receipt behind a /r/:code path, or null — a bad code, no such live receipt, or a slow API. */
export async function loadReceiptCard(apiUrl: string, bare: string): Promise<ReceiptCard | null> {
  const r = await getPublic<PublicReceipt>(apiUrl, `/pay/public/receipt/${encodeURIComponent(bare)}`);
  return r ? receiptCard(r, receiptPageUrl(bare)) : null;
}
