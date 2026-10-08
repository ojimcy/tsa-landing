// The TSA Pay public payment shapes and pure helpers, with no imports so the
// Netlify edge functions (Deno) can share them with the page.

export type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "expired";

export type PaymentMode = "live" | "test";

export type PaymentSource = "api" | "link" | "open";

export type PublicPayment = {
  id: string;
  /** The payment's code, "TSA-XXXXX-XXXXX": copied or read out, typed in the app (Wallet → TSA Pay), and the receipt's number. */
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
