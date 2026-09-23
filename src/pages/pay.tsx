import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Reveal } from "@/components/reveal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { site } from "@/data/content";
import {
  fetchPublicPayment,
  formatKobo,
  isUuid,
  shouldPollAgain,
  withPaymentParams,
  type PublicPayment,
} from "@/lib/pay";

const POLL_INTERVAL_MS = 5000;

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
    window.document.title = `Pay · ${site.name}`;
  }, []);

  useEffect(() => {
    if (!validId || !id) return;

    let cancelled = false;
    let fetchedOnce = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const result = await fetchPublicPayment(id);
        if (cancelled) return;
        fetchedOnce = true;
        setPayment(result);
        setError("");
        if (shouldPollAgain({ fetchedOnce, error: false, status: result.status })) {
          timer = setTimeout(tick, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        // A transient error after we've already confirmed the payment exists
        // must not surface as a fatal error or stop polling — only the very
        // first fetch failing is fatal (nothing to retry toward yet).
        if (!fetchedOnce) {
          setError(err instanceof Error ? err.message : "Unable to load this payment.");
        }
        if (shouldPollAgain({ fetchedOnce, error: true })) {
          timer = setTimeout(tick, POLL_INTERVAL_MS);
        }
      }
      if (!cancelled) setLoading(false);
    };

    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [validId, id, retryKey]);

  const returnHref = useMemo(() => {
    if (!payment?.returnUrl || !id) return null;
    return withPaymentParams(payment.returnUrl, id, payment.status);
  }, [payment, id]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* This page is reached from a shared checkout link — never send the
          payment id or query string on to third-party resources it embeds. */}
      <meta name="referrer" content="no-referrer" />
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-white via-amber-50/40 to-white">
          <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <Reveal>
              <Card className="border-brand/10 shadow-sm">
                <CardContent className="p-8 text-center">
                  {!validId ? (
                    <InvalidPayment />
                  ) : loading ? (
                    <LoadingPayment />
                  ) : error && !payment ? (
                    <InvalidPayment message={error} onRetry={retry} />
                  ) : payment ? (
                    <PaymentStatusView payment={payment} returnHref={returnHref} />
                  ) : null}
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function InvalidPayment({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <>
      <XCircle className="mx-auto h-10 w-10 text-slate-300" />
      <p className="mt-4 text-base font-medium text-slate-700">
        {message || "This payment link isn't valid."}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </>
  );
}

function LoadingPayment() {
  return (
    <>
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" />
      <p className="mt-4 text-sm text-slate-500">Loading payment…</p>
    </>
  );
}

function PaymentStatusView({
  payment,
  returnHref,
}: {
  payment: PublicPayment;
  returnHref: string | null;
}) {
  return (
    <>
      <p className="text-sm font-medium uppercase tracking-wider text-slate-400">
        {payment.merchantName}
      </p>
      <p className="mt-2 text-3xl font-bold text-slate-900">
        {formatKobo(payment.customerTotal)}
      </p>

      {(payment.status === "pending" || payment.status === "processing") && (
        <PendingPayment payment={payment} />
      )}

      {payment.status === "succeeded" && (
        <div className="mt-6">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
          <p className="mt-3 text-base font-semibold text-green-700">Paid</p>
          {returnHref && (
            <Button asChild size="lg" className="mt-6 w-full">
              <a href={returnHref}>Return to {payment.merchantName}</a>
            </Button>
          )}
        </div>
      )}

      {(payment.status === "failed" || payment.status === "expired") && (
        <div className="mt-6">
          <XCircle className="mx-auto h-10 w-10 text-red-500" />
          <p className="mt-3 text-base font-semibold text-slate-700">
            {payment.status === "expired" ? "This payment link has expired." : "This payment failed."}
          </p>
          <p className="mt-2 text-sm text-slate-500">Ask the store for a new payment link.</p>
        </div>
      )}
    </>
  );
}

function PendingPayment({ payment }: { payment: PublicPayment }) {
  const mobile = isMobile();

  return (
    <div className="mt-6">
      <p className="text-xs font-medium uppercase tracking-wider text-brand">
        {payment.status === "processing" ? "Processing" : "Awaiting payment"}
      </p>

      {mobile ? (
        <div className="mt-4 space-y-3">
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              window.location.href = payment.appUrl;
            }}
          >
            Open TSA Connect
          </Button>
          <p className="text-xs text-slate-500">
            Don&apos;t have the app yet?{" "}
            <a href="/#download" className="font-medium text-brand hover:underline">
              Get TSA Connect
            </a>
          </p>
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
    </div>
  );
}
