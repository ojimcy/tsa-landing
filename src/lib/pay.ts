import { API_URL } from "@/lib/api";
import { site } from "@/data/content";
import { formatKobo, type PaymentStatus, type PublicOpenLink, type PublicPayment } from "@/lib/pay-core";

export * from "@/lib/pay-core";

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

/**
 * True on a phone or tablet, where the app can be opened from this page. The
 * user agent alone is not enough: Chrome's "Desktop site" mode and iPadOS both
 * claim to be a desktop, so a touch-first screen counts as well.
 */
export function isHandheld(device: { userAgent: string; coarsePointer: boolean }): boolean {
  return /Android|iPhone|iPad/i.test(device.userAgent) || device.coarsePointer;
}

const CHECKOUT_HOSTS: ReadonlySet<string> = new Set([site.domain, `www.${site.domain}`]);

/**
 * The reusable link to start again from, or null unless it is an https
 * /pay/l/ page on our own checkout host (this page's origin, or the
 * production domain) — the payer is sent there without a second look.
 */
export function ownOpenLinkUrl(s: string | undefined): string | null {
  const url = s ? parseHttpsUrl(s) : null;
  if (!url || !url.pathname.startsWith("/pay/l/")) return null;
  const ownHost = url.origin === window.location.origin || CHECKOUT_HOSTS.has(url.host);
  return ownHost ? url.toString() : null;
}

/**
 * A receipt's verify URL from the API, only if it really is /r/TSA-XXXXX-XXXXX on
 * our own host: the QR and seal on a receipt vouch for the page it opens.
 */
export function ownReceiptUrl(s: string | undefined): string | null {
  const url = s ? parseHttpsUrl(s) : null;
  if (!url || !/^\/r\/TSA-[0-9A-Z]{5}-[0-9A-Z]{5}$/.test(url.pathname)) return null;
  const ownHost = url.origin === window.location.origin || CHECKOUT_HOSTS.has(url.host);
  return ownHost ? url.toString() : null;
}

/**
 * The headline and next step shown for a payment that can no longer be paid.
 * restartHref is set when the payer can simply start again: a payment made
 * through a reusable link that timed out or failed while the link is still open.
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
  if (payment.source === "open") {
    const title = payment.status === "expired" ? "This payment timed out." : "This payment failed.";
    const restartHref = ownOpenLinkUrl(payment.openLinkUrl);
    return restartHref ? { title, restartHref } : { title, hint: "Ask the store for a new payment link." };
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

/** True when the API says there is no such link, or it has stopped taking payments. */
export function isOpenLinkClosedError(err: unknown): boolean {
  return (
    err instanceof PayApiError &&
    (err.status === 404 || err.code === "link_not_found" || err.code === "link_closed")
  );
}

export const OPEN_LINK_LOAD_ERROR = "Unable to load this payment link. Please try again.";

export function fetchPublicOpenLink(slug: string): Promise<PublicOpenLink> {
  return requestPayApi(`/pay/public/open/${encodeURIComponent(slug)}`, {}, OPEN_LINK_LOAD_ERROR);
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

export const POLL_INTERVAL_MS = 5000;
const MAX_POLL_INTERVAL_MS = 60_000;

/**
 * How long to wait before the next status check: the normal interval, doubled
 * for each failed check in a row (up to a minute), so an API outage isn't met
 * with a steady stream of requests from every open checkout page.
 */
export function pollDelayMs(consecutiveErrors: number): number {
  return Math.min(POLL_INTERVAL_MS * 2 ** Math.max(consecutiveErrors, 0), MAX_POLL_INTERVAL_MS);
}
