import { API_URL } from "@/lib/api";

export type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "expired";

export type PaymentMode = "live" | "test";

export type PaymentSource = "api" | "link" | "open";

export type PublicPayment = {
  id: string;
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
 * Parses an absolute https URL. Anything else is null — rejects javascript:
 * and other schemes a URL from the API could otherwise smuggle into an href.
 */
export function parseHttpsUrl(s: string): URL | null {
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  return url.protocol === "https:" ? url : null;
}

/** Appends payment_id and status to returnUrl, before any #fragment; https only. */
export function withPaymentParams(returnUrl: string, id: string, status: string): string | null {
  const url = parseHttpsUrl(returnUrl);
  if (!url) return null;

  url.searchParams.set("payment_id", id);
  url.searchParams.set("status", status);
  return url.toString();
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
 * The headline and next step shown for a payment that can no longer be paid.
 * restartHref is set when the payer can simply start again: a payment made
 * through a reusable link that timed out while the link is still open.
 */
export function closedPaymentCopy(payment: PublicPayment): {
  title: string;
  hint?: string;
  restartHref?: string;
} {
  if (payment.cancelled) {
    return {
      title: `This payment link was cancelled by ${payment.merchantName}.`,
      hint: "Contact them for a new one.",
    };
  }
  if (payment.status === "expired" && payment.source === "open") {
    const restart = payment.openLinkUrl ? parseHttpsUrl(payment.openLinkUrl) : null;
    return restart
      ? { title: "This payment timed out.", restartHref: restart.toString() }
      : { title: "This payment timed out.", hint: "Ask the store for a new payment link." };
  }
  if (payment.status === "expired") {
    return { title: "This payment link has expired.", hint: "Ask the store for a new payment link." };
  }
  return { title: "This payment failed.", hint: "Ask the store for a new payment link." };
}

const FETCH_TIMEOUT_MS = 10_000;
const GENERIC_FETCH_ERROR = "Unable to load this payment. Please try again.";

/** A refusal from the TSA Pay API, carrying its HTTP status and machine code (if any). */
export class PayApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "PayApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Calls a public TSA Pay endpoint. Times out a stalled connection rather than
 * hanging forever, and only surfaces the API's own error message for a 4xx
 * (a real, user-facing refusal); a 5xx, a network failure, or an unparseable
 * response all collapse to one generic, friendly message instead of raw
 * fetch/JSON error text.
 */
async function requestPayApi<T>(path: string, init: RequestInit, genericError: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch {
    throw new PayApiError(genericError, 0);
  }

  let data: { success?: boolean; message?: string; code?: string; data?: unknown } | null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || !data?.success) {
    const isClientError = res.status >= 400 && res.status < 500;
    throw new PayApiError((isClientError && data?.message) || genericError, res.status, data?.code);
  }

  return data.data as T;
}

/**
 * Fetches a payment's public (unauthenticated) view. Plain GET, no headers
 * — keeps it preflight-free.
 */
export function fetchPublicPayment(id: string): Promise<PublicPayment> {
  return requestPayApi(`/pay/public/${encodeURIComponent(id)}`, {}, GENERIC_FETCH_ERROR);
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

/** A link slug is lowercase words joined by hyphens — used to reject junk before hitting the API. */
export function isLinkSlug(s: string): boolean {
  return s.length <= 64 && LINK_SLUG_RE.test(s);
}

/** True when the API says there is no such link, or it has stopped taking payments. */
export function isOpenLinkClosedError(err: unknown): boolean {
  return (
    err instanceof PayApiError &&
    (err.status === 404 || err.code === "link_not_found" || err.code === "link_closed")
  );
}

export function fetchPublicOpenLink(slug: string): Promise<PublicOpenLink> {
  return requestPayApi(
    `/pay/public/open/${encodeURIComponent(slug)}`,
    {},
    "Unable to load this payment link. Please try again.",
  );
}

/** Starts a new payment through an open link; the payer then finishes it on /pay/:id. */
export function createOpenLinkPayment(
  slug: string,
  input: { amount: number; note: string },
): Promise<{ id: string }> {
  return requestPayApi(
    `/pay/public/open/${encodeURIComponent(slug)}/payments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "We couldn't start your payment. Please try again.",
  );
}

// Whole naira either plain ("45000") or comma-grouped in threes ("45,000").
const NAIRA_RE = /^(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/;

/**
 * Reads a naira amount typed by the payer ("45000", "45,000.50") as kobo.
 * Null for anything that isn't a plain positive amount with at most two
 * decimal places. A comma is only a thousands separator, never a decimal
 * point: "5000,50" is refused rather than read as ₦500,050. String
 * arithmetic, so no floating-point drift.
 */
export function parseNairaToKobo(input: string): number | null {
  const match = NAIRA_RE.exec(input.trim());
  if (!match) return null;
  const naira = Number(match[1].replace(/,/g, ""));
  const kobo = naira * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(kobo) && kobo > 0 ? kobo : null;
}

/** The kobo amount the payer typed if it's inside the link's limits, or why it can't be paid. */
export function resolveOpenLinkAmount(
  link: PublicOpenLink,
  typed: string,
): { amount: number } | { error: string } {
  const kobo = parseNairaToKobo(typed);
  if (kobo === null) return { error: "Enter an amount, like 5000 or 5000.50." };
  if (kobo < link.minAmount) return { error: `The least you can pay here is ${formatKobo(link.minAmount)}.` };
  if (kobo > link.maxAmount) return { error: `The most you can pay here is ${formatKobo(link.maxAmount)}.` };
  return { amount: kobo };
}

const TERMINAL_STATUSES: ReadonlySet<PaymentStatus> = new Set(["succeeded", "failed", "expired"]);

export function isTerminalStatus(status: PaymentStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/**
 * Decides whether the /pay/:id poll loop should schedule another tick.
 *
 * A fetch error is only fatal the first time — before we've ever confirmed the
 * payment exists, there's nothing to retry toward. Once at least one fetch has
 * succeeded, a later transient error (a dropped request, a 500, a flaky mobile
 * connection) must NOT stop polling: the customer already has a known
 * pending/processing payment and could miss a later `succeeded` update.
 */
export function shouldPollAgain(params: {
  fetchedOnce: boolean;
  error: boolean;
  status?: PaymentStatus;
}): boolean {
  if (params.error) return params.fetchedOnce;
  if (!params.status) return false;
  return !isTerminalStatus(params.status);
}
