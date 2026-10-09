// The TSA Pay public payment shapes and pure helpers, with no imports so the
// Netlify edge functions (Deno) can share them with the page.

export type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "expired";

export type PaymentMode = "live" | "test";

export type PaymentSource = "api" | "link" | "open";

export type PublicPayment = {
  id: string;
  /** The payment's code, "TSA-XXXXX-XXXXX": copied or read out, typed in the app (Home → Pay), and the receipt's number. */
  payCode?: string;
  merchantName: string;
  status: PaymentStatus;
  amount: number;
  customerTotal: number;
  currency: string;
  expiresAt: string;
  returnUrl?: string;
  appUrl: string;
  mode?: PaymentMode;
  source?: PaymentSource;
  /**
   * What the payment is for — always set on a payment link. On a payment made
   * through a reusable link (source "open") it is the payer's own note instead.
   */
  description?: string;
  /** The reusable link's label (source "open") — what the payer is paying for. */
  linkLabel?: string;
  /** The reusable link to start again from (source "open"), only while it still takes payments. */
  openLinkUrl?: string;
  /** Who the merchant asked to pay, when they named someone. */
  customerName?: string;
  /** The merchant closed the link before it was paid (status reads "expired"). */
  cancelled?: boolean;
  /** When it was paid — shown on the receipt when the API sends it. */
  succeededAt?: string;
  /** The public page that verifies this payment's receipt — live payments only, once succeeded. */
  receiptUrl?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A TSA Pay payment id is a UUID — used to reject junk before hitting the API. */
export function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

/** Formats an integer kobo amount as a Naira string, e.g. 5_050_506 -> "₦50,505.06". */
export function formatKobo(kobo: number): string {
  const naira = kobo / 100;
  return `₦${naira.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * What the payer is paying for, and their own note: a reusable link's label
 * is the "for", and the description is then the payer's note to the merchant.
 */
export function paymentPurpose(payment: PublicPayment): { paidFor?: string; customerNote?: string } {
  if (payment.source === "open") {
    return { paidFor: payment.linkLabel, customerNote: payment.description };
  }
  return { paidFor: payment.description };
}

/**
 * A merchant's reusable "open" payment link (e.g. a shop QR): the payer types
 * the amount. Amounts are kobo, bounds already narrowed to what the link accepts.
 */
export type PublicOpenLink = {
  merchantName: string;
  /** What the payer sees as the heading, e.g. "Mama Ngozi Store — Shop 12". */
  label: string;
  mode?: PaymentMode;
  minAmount: number;
  maxAmount: number;
  active: boolean;
};

const LINK_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A link slug is words joined by hyphens — used to reject junk before hitting
 * the API. Case doesn't matter: the server lowercases it.
 */
export function isLinkSlug(s: string): boolean {
  return s.length <= 64 && LINK_SLUG_RE.test(s.toLowerCase());
}

const LAGOS_DATE_TIME = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
  timeZone: "Africa/Lagos",
});

/** Formats an ISO timestamp in Lagos time, e.g. "3 Oct 2026, 14:30 WAT"; null if unparseable. */
export function formatLagosDateTime(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return LAGOS_DATE_TIME.format(date);
}

/** A succeeded live payment's public receipt (GET /pay/public/receipt/:code) — what /r/:code shows. */
export type PublicReceipt = {
  /** "TSA-XXXXX-XXXXX". */
  code: string;
  merchantName: string;
  /** What the payer paid, in kobo. */
  amount: number;
  currency: string;
  description: string;
  /** The description is the payer's own note (a reusable-link payment), not the business's words. */
  descriptionIsCustomerNote: boolean;
  paidAt: string;
  /** The payer by initials only ("C.O."); empty when there is no one to name. */
  payerInitials: string;
  refundStatus: "none" | "partial" | "full";
  /** Refunded so far, in USD ("12.50"). */
  refundedAmount: string;
};

const PAY_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
// The API's payCodeIgnored list (and the app's), spelled out code point by code
// point — never \p{Pd}, whose contents move with the browser's Unicode version.
// Whitespace is Go's unicode.IsSpace set (JS \s also takes U+FEFF, which the API
// refuses); dashes are Unicode 15's Pd.
const PAY_CODE_IGNORED =
  /[\t\n\v\f\r \u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\-\u058a\u05be\u1400\u1806\u2010-\u2015\u2e17\u2e1a\u2e3a\u2e3b\u2e40\u2e5d\u301c\u3030\u30a0\ufe31\ufe32\ufe58\ufe63\uff0d\u{10ead}]/gu;

/**
 * A payment code as the bare ten characters the API stores, or null when it
 * can't be one. Mirrors the API's NormalizePayCode
 * (tsa-api-go/internal/services/pay_code.go) — change both together:
 * whitespace and dashes of any kind dropped, any other non-ASCII character
 * refused, upper-cased, a leading TSA dropped only when exactly a code's worth
 * follows it, O read as 0 and I/L as 1.
 */
export function normalizePayCode(input: string): string | null {
  if (input.length > 64) return null;
  let code = input.replace(PAY_CODE_IGNORED, "");
  // Checked before upper-casing, which folds ı to I and ſ to S: a code is ASCII.
  if (/[\u0080-\u{10ffff}]/u.test(code)) return null;
  code = code.toUpperCase();
  if (code.length === 13 && code.startsWith("TSA")) code = code.slice(3);
  if (code.length !== 10) return null;
  code = code.replace(/O/g, "0").replace(/[IL]/g, "1");
  for (const ch of code) if (!PAY_CODE_ALPHABET.includes(ch)) return null;
  return code;
}

/** A stored ten-character code as the payer sees it: TSA-XXXXX-XXXXX. */
export function formatPayCode(bare: string): string {
  return `TSA-${bare.slice(0, 5)}-${bare.slice(5)}`;
}

/** The receipt's refund line, or null when nothing was refunded. */
export function receiptRefundLine(r: Pick<PublicReceipt, "refundStatus" | "refundedAmount">): string | null {
  if (r.refundStatus === "full") return `Refunded in full · ${r.refundedAmount} USD`;
  if (r.refundStatus === "partial") return `Partly refunded · ${r.refundedAmount} USD`;
  return null;
}
