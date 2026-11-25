// A shared bill receipt (tsaconnectworld.com/b/<code>): the API's public
// receipt of a delivered bill, as the receipt page, its chat preview and its
// 1080×1350 image. Like receipt-share.ts it is drawn only from the API — never
// from the URL — so nobody can make a TSA-branded receipt for a bill that wasn't
// paid. Only relative .ts imports, so the edge functions (Deno) can load it.
import { formatLagosDateTime, formatPayCode, normalizePayCode } from "./pay-core.ts";
import { cardVersion, clip, getPublic, type ShareMeta } from "./pay-share.ts";
import { RECEIPT_IMAGE_HEIGHT, RECEIPT_IMAGE_WIDTH, SITE_ORIGIN } from "./receipt-share.ts";

export type BillCategory = "airtime" | "data" | "electricity" | "cabletv" | "betting" | "epin";

/** GET /api/bills/public/receipt/:code */
export type PublicBillReceipt = {
  code: string;
  category: BillCategory | string;
  providerName: string;
  recipient: string;
  customerName?: string;
  planName?: string;
  meterType?: "prepaid" | "postpaid";
  /** Whole naira. */
  amount: number;
  /** Prepaid meter token / exam PIN. */
  token?: string;
  paidAt: string;
  payerInitials?: string;
};

const TITLES: Record<string, string> = {
  airtime: "Airtime",
  data: "Data",
  electricity: "Electricity",
  cabletv: "Cable TV",
  betting: "Betting",
  epin: "Exam PIN",
};

/** What a bill receipt shows, in display order. */
export type BillReceiptCard = {
  code: string;
  title: string;
  amount: string;
  /** "MTN airtime to 0803 412 7788" */
  subline: string;
  rows: [string, string, boolean?][];
  verifyUrl: string;
};

export function formatNaira(n: number): string {
  return `₦${n.toLocaleString("en-NG")}`;
}

/** "0803 412 7788" for an 11-digit number; other ids as they are. */
export function formatRecipient(id: string): string {
  return /^0\d{10}$/.test(id) ? `${id.slice(0, 4)} ${id.slice(4, 7)} ${id.slice(7)}` : id;
}

/** Meter tokens and PINs in fours, as a keypad prints them. */
export function groupToken(token: string): string {
  const digits = token.replace(/\s+/g, "");
  return /^\d{8,}$/.test(digits) ? (digits.match(/.{1,4}/g) ?? [digits]).join(" ") : token;
}

function recipientLabel(category: string): string {
  if (category === "electricity") return "Meter number";
  if (category === "cabletv") return "Smartcard";
  if (category === "betting") return "Account ID";
  return "Phone number";
}

export function billReceiptCard(r: PublicBillReceipt, verifyUrl: string): BillReceiptCard {
  const title = TITLES[r.category] ?? "Bill";
  const provider = clip(r.providerName, 32) ?? "";
  const who = r.customerName ? clip(r.customerName, 32)! : formatRecipient(r.recipient);
  const rows: [string, string | undefined, boolean?][] = [
    [r.category === "epin" ? "PIN" : "Token", r.token ? groupToken(r.token) : undefined, true],
    [r.category === "airtime" || r.category === "data" ? "Network" : "Provider", provider],
    [recipientLabel(r.category), formatRecipient(r.recipient)],
    ["Name", clip(r.customerName, 40)],
    [r.category === "cabletv" ? "Package" : "Plan", clip(r.planName, 40)],
    ["Meter type", r.meterType === "postpaid" ? "Postpaid" : r.meterType === "prepaid" ? "Prepaid" : undefined],
    ["Paid by", r.payerInitials],
    ["Paid on", formatLagosDateTime(r.paidAt) ?? undefined],
    ["Receipt code", r.code, true],
  ];
  return {
    code: r.code,
    title,
    amount: formatNaira(r.amount),
    // Telcos read "MTN airtime to 0803…"; elsewhere the provider is in the rows
    // ("Ikeja Electric electricity" would say it twice).
    subline: r.category === "airtime" || r.category === "data" ? `${provider} ${title.toLowerCase()} to ${who}` : `${title} for ${who}`,
    rows: rows.filter((x): x is [string, string, boolean?] => !!x[1]),
    verifyUrl,
  };
}

/** The bare code a /b/:code path names, or null for anything else. */
export function parseBillReceiptPath(pathname: string): string | null {
  const m = /^\/b\/([^/]+)\/?$/.exec(pathname);
  if (!m) return null;
  try {
    return normalizePayCode(decodeURIComponent(m[1]));
  } catch {
    return null;
  }
}

/** The canonical public page a bill receipt's QR opens. */
export function billReceiptPageUrl(bare: string): string {
  return `${SITE_ORIGIN}/b/${formatPayCode(bare)}`;
}

/** The receipt image, e.g. /og/b/TSA-8D4DQ-Y4DMN.png?v=…; the version moves if the receipt changes. */
export function billReceiptImageUrl(origin: string, bare: string, card: BillReceiptCard): string {
  return `${origin}/og/b/${formatPayCode(bare)}.png?v=${cardVersion(card)}`;
}

export function billReceiptShareMeta(card: BillReceiptCard, origin: string, bare: string): ShareMeta {
  const paidOn = card.rows.find(([label]) => label === "Paid on")?.[1];
  return {
    title: `Receipt: ${card.amount} ${card.title.toLowerCase()}`,
    description: [card.subline, paidOn && `Paid ${paidOn}`, card.code, "Verified by TSA Connect"].filter(Boolean).join(" · "),
    url: billReceiptPageUrl(bare),
    image: billReceiptImageUrl(origin, bare, card),
    imageWidth: RECEIPT_IMAGE_WIDTH,
    imageHeight: RECEIPT_IMAGE_HEIGHT,
  };
}

/** The receipt behind a /b/:code path, or null — a bad code, no such receipt, or a slow API. */
export async function loadBillReceiptCard(apiUrl: string, bare: string): Promise<BillReceiptCard | null> {
  const r = await getPublic<PublicBillReceipt>(apiUrl, `/bills/public/receipt/${encodeURIComponent(bare)}`);
  return r ? billReceiptCard(r, billReceiptPageUrl(bare)) : null;
}
