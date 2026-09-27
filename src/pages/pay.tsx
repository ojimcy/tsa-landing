import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GetTheApp, PayLoading, PayNotice, PayShell, TestModeBanner } from "@/components/pay/pay-shell";
import {
  closedPaymentCopy,
  fetchPublicPayment,
  formatKobo,
  formatLagosDateTime,
  isUuid,
  paymentPurpose,
  pollDelayMs,
  shouldPollAgain,
  withPaymentParams,
  type PublicPayment,
} from "@/lib/pay";

const INVALID_LINK = "This payment link isn't valid.";

const isMobile = () => /Android|iPhone|iPad/i.test(navigator.userAgent);

export default function PayPage() {
  const { id } = useParams<{ id: string }>();
  const validId = !!id && isUuid(id);

  const [payment, setPayment] = useState<PublicPayment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(validId);
  const [retryKey, setRetryKey] = useState(0);

  const retry = () => {
    setError("");
    setLoading(true);
    setRetryKey((k) => k + 1);
  };

  useEffect(() => {
    if (!validId || !id) return;

    let cancelled = false;
    let fetchedOnce = false;
    let consecutiveErrors = 0;
    let inFlight = false;
    // True while another check is due: scheduled, or held back by a hidden tab.
    let polling = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (delay: number) => {
      polling = true;
      timer = setTimeout(() => {
        timer = undefined;
        // A background tab doesn't poll; the visibility listener picks it up again.
        if (!document.hidden) tick();
      }, delay);
    };

    const tick = async () => {
      polling = false;
      inFlight = true;
      try {
        const result = await fetchPublicPayment(id);
        if (cancelled) return;
        fetchedOnce = true;
        consecutiveErrors = 0;
        setPayment(result);
        setError("");
        if (shouldPollAgain({ fetchedOnce, error: false, status: result.status })) {
          schedule(pollDelayMs(0));
        }
      } catch (err) {
        if (cancelled) return;
        consecutiveErrors++;
        // A transient error after we've already confirmed the payment exists
        // must not surface as a fatal error or stop polling — only the very
        // first fetch failing is fatal (nothing to retry toward yet).
        if (!fetchedOnce) {
          setError(err instanceof Error ? err.message : "Unable to load this payment.");
        }
        if (shouldPollAgain({ fetchedOnce, error: true })) {
          schedule(pollDelayMs(consecutiveErrors));
        }
      } finally {
        inFlight = false;
      }
      if (!cancelled) setLoading(false);
    };

    // Back in view: check straight away rather than wait out the interval.
    const onVisibilityChange = () => {
      if (document.hidden || !polling || inFlight) return;
      if (timer) clearTimeout(timer);
      timer = undefined;
      tick();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    tick();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (timer) clearTimeout(timer);
    };
  }, [validId, id, retryKey]);

  const returnHref = useMemo(() => {
    if (!payment?.returnUrl || !id) return null;
    return withPaymentParams(payment.returnUrl, id, payment.status);
  }, [payment, id]);

  return (
    <PayShell>
      {!validId ? (
        <PayNotice message={INVALID_LINK} />
      ) : loading ? (
        <PayLoading label="Loading payment…" />
      ) : error && !payment ? (
        <PayNotice message={error} onRetry={retry} />
      ) : payment ? (
        <PaymentStatusView payment={payment} returnHref={returnHref} />
      ) : null}
    </PayShell>
  );
}

export function PaymentStatusView({
  payment,
  returnHref,
}: {
  payment: PublicPayment;
  returnHref: string | null;
}) {
  return (
    <>
      {payment.mode === "test" && <TestModeBanner />}
      {/* With nowhere to send the payer back to, the page itself is their proof of payment. */}
      {payment.status === "succeeded" && !returnHref ? (
        <PaymentReceipt payment={payment} />
      ) : (
        <PaymentSummary payment={payment} returnHref={returnHref} />
      )}
    </>
  );
}

function PaymentSummary({
  payment,
  returnHref,
}: {
  payment: PublicPayment;
  returnHref: string | null;
}) {
  const closed = payment.status === "failed" || payment.status === "expired";
  const { paidFor, customerNote } = paymentPurpose(payment);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-wider text-slate-400 wrap-anywhere">
        {payment.merchantName}
      </p>
      <p className="mt-2 text-3xl font-bold text-slate-900">
        {formatKobo(payment.customerTotal)}
      </p>
      {paidFor && <p className="mt-2 text-base text-slate-700 wrap-anywhere">{paidFor}</p>}
      {customerNote && (
        <p className="mt-1 text-sm text-slate-500 wrap-anywhere">Note from customer: {customerNote}</p>
      )}
      {payment.customerName && (
        <p className="mt-1 text-sm text-slate-500 wrap-anywhere">Requested for {payment.customerName}</p>
      )}

      {(payment.status === "pending" || payment.status === "processing") && (
        <PendingPayment payment={payment} />
      )}

      {payment.status === "succeeded" && returnHref && (
        <div className="mt-6">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
          <p className="mt-3 text-base font-semibold text-green-700">Paid</p>
          <Button asChild size="lg" className="mt-6 h-auto w-full whitespace-normal py-3 wrap-anywhere">
            <a href={returnHref}>Return to {payment.merchantName}</a>
          </Button>
        </div>
      )}

      {closed && <ClosedPayment payment={payment} />}
    </>
  );
}

function ClosedPayment({ payment }: { payment: PublicPayment }) {
  const { title, hint, restartHref } = closedPaymentCopy(payment);
  return (
    <div className="mt-6">
      <XCircle className="mx-auto h-10 w-10 text-red-500" />
      <p className="mt-3 text-base font-semibold text-slate-700 wrap-anywhere">{title}</p>
      {hint && <p className="mt-2 text-sm text-slate-500">{hint}</p>}
      {restartHref && (
        <Button asChild size="lg" className="mt-6 w-full">
          <a href={restartHref}>Start a new payment</a>
        </Button>
      )}
    </div>
  );
}

function PaymentReceipt({ payment }: { payment: PublicPayment }) {
  const paidAt = formatLagosDateTime(payment.succeededAt);
  const { paidFor, customerNote } = paymentPurpose(payment);
  const rows: [string, string | null | undefined][] = [
    ["Paid to", payment.merchantName],
    ["For", paidFor],
    ["Note from customer", customerNote],
    ["Requested for", payment.customerName],
    ["Paid on", paidAt],
  ];

  return (
    <>
      <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
      <p className="mt-3 text-base font-semibold text-green-700">Paid</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">
        {formatKobo(payment.customerTotal)}
      </p>
      <dl className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 text-left text-sm">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-slate-500">{label}</dt>
              <dd className="min-w-0 text-right font-medium text-slate-900 wrap-anywhere">{value}</dd>
            </div>
          ))}
      </dl>
      <p className="mt-4 text-xs text-slate-500">Keep this page as your receipt.</p>
    </>
  );
}

function PendingPayment({ payment }: { payment: PublicPayment }) {
  const mobile = isMobile();
  const openUntil = formatLagosDateTime(payment.expiresAt);

  return (
    <div className="mt-6">
      <p className="text-xs font-medium uppercase tracking-wider text-brand">
        {payment.status === "processing" ? "Processing" : "Awaiting payment"}
      </p>
      {payment.status === "pending" && openUntil && (
        <p className="mt-1 text-xs text-slate-500">
          {/* A reusable link stays open; only this one payment runs out. */}
          {payment.source === "open" ? `Pay by ${openUntil}` : `Link open until ${openUntil}`}
        </p>
      )}

      {mobile ? (
        <div className="mt-4">
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              window.location.href = payment.appUrl;
            }}
          >
            Open TSA Connect
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <QRCodeSVG value={payment.appUrl} size={220} />
          </div>
          <p className="max-w-xs text-sm text-slate-500">
            Scan with your phone camera to pay in TSA Connect
          </p>
        </div>
      )}

      <GetTheApp />
    </div>
  );
}
