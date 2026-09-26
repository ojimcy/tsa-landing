import { API_URL } from "@/lib/api";

export type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "expired";

export type PaymentMode = "live" | "test";

export type PaymentSource = "api" | "link";

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
  /** What the payment is for — always set on a payment link. */
  description?: string;
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
 * Appends payment_id and status to returnUrl, before any #fragment.
 * Only https URLs are accepted (rejects javascript: and other schemes a
 * merchant-supplied returnUrl could otherwise smuggle in).
 */
export function withPaymentParams(returnUrl: string, id: string, status: string): string | null {
  let url: URL;
  try {
    url = new URL(returnUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

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

/** The headline and next step shown for a payment that can no longer be paid. */
export function closedPaymentCopy(payment: PublicPayment): { title: string; hint: string } {
  if (payment.cancelled) {
    return {
      title: `This payment link was cancelled by ${payment.merchantName}.`,
      hint: "Contact them for a new one.",
    };
  }
  if (payment.status === "expired") {
    return { title: "This payment link has expired.", hint: "Ask the store for a new payment link." };
  }
  return { title: "This payment failed.", hint: "Ask the store for a new payment link." };
}

const FETCH_TIMEOUT_MS = 10_000;
const GENERIC_FETCH_ERROR = "Unable to load this payment. Please try again.";

/**
 * Fetches a payment's public (unauthenticated) view. Plain GET, no headers
 * — keeps it preflight-free. Times out a stalled connection rather than
 * hanging forever, and only surfaces the API's own error message for a 4xx
 * (a real, user-facing refusal); a 5xx, a network failure, or an
 * unparseable response all collapse to one generic, friendly message
 * instead of raw fetch/JSON error text.
 */
export async function fetchPublicPayment(id: string): Promise<PublicPayment> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/pay/public/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new Error(GENERIC_FETCH_ERROR);
  }

  let data: { success?: boolean; message?: string; data?: unknown } | null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || !data?.success) {
    const isClientError = res.status >= 400 && res.status < 500;
    throw new Error((isClientError && data?.message) || GENERIC_FETCH_ERROR);
  }

  return data.data as PublicPayment;
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
