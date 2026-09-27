import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GetTheApp, PayLoading, PayNotice, PayShell, TestModeBanner } from "@/components/pay/pay-shell";
import {
  createOpenLinkPayment,
  fetchPublicOpenLink,
  formatKobo,
  isLinkSlug,
  isOpenLinkClosedError,
  isUuid,
  OPEN_LINK_LOAD_ERROR,
  resolveOpenLinkAmount,
  type PublicOpenLink,
} from "@/lib/pay";

const LINK_CLOSED = "This payment link isn't accepting payments right now.";
const START_FAILED = "We couldn't start your payment. Please try again.";
const NOTE_MAX_LENGTH = 140;

const INPUT_CLASS =
  "block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-base text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

type LinkState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "closed"; merchantName?: string }
  | { kind: "open"; link: PublicOpenLink };

export default function PayOpenLinkPage() {
  const { slug } = useParams<{ slug: string }>();
  const validSlug = !!slug && isLinkSlug(slug);

  const [state, setState] = useState<LinkState>({ kind: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  const retry = () => {
    setState({ kind: "loading" });
    setRetryKey((k) => k + 1);
  };

  useEffect(() => {
    if (!validSlug || !slug) return;

    let cancelled = false;
    fetchPublicOpenLink(slug).then(
      (link) => {
        if (cancelled) return;
        setState(link.active ? { kind: "open", link } : { kind: "closed", merchantName: link.merchantName });
      },
      (err) => {
        if (cancelled) return;
        setState(
          isOpenLinkClosedError(err)
            ? { kind: "closed" }
            : { kind: "error", message: err instanceof Error ? err.message : OPEN_LINK_LOAD_ERROR },
        );
      },
    );

    return () => {
      cancelled = true;
    };
  }, [validSlug, slug, retryKey]);

  return (
    <PayShell>
      {!validSlug ? (
        <PayNotice message={LINK_CLOSED} />
      ) : state.kind === "loading" ? (
        <PayLoading label="Loading…" />
      ) : state.kind === "error" ? (
        <PayNotice message={state.message} onRetry={retry} />
      ) : state.kind === "closed" ? (
        <ClosedLink merchantName={state.merchantName} />
      ) : (
        <OpenLinkCheckout
          slug={slug}
          link={state.link}
          onClosed={() => setState({ kind: "closed", merchantName: state.link.merchantName })}
        />
      )}
    </PayShell>
  );
}

function ClosedLink({ merchantName }: { merchantName?: string }) {
  return (
    <>
      {merchantName && <MerchantName name={merchantName} />}
      <div className={merchantName ? "mt-4" : undefined}>
        <PayNotice message={LINK_CLOSED} />
      </div>
    </>
  );
}

function MerchantName({ name }: { name: string }) {
  return (
    <p className="text-sm font-medium uppercase tracking-wider text-slate-400 wrap-anywhere">{name}</p>
  );
}

function OpenLinkCheckout({
  slug,
  link,
  onClosed,
}: {
  slug: string;
  link: PublicOpenLink;
  onClosed: () => void;
}) {
  const navigate = useNavigate();
  const [amountText, setAmountText] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [amountInvalid, setAmountInvalid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const resolved = resolveOpenLinkAmount(link, amountText);
    if ("error" in resolved) {
      setError(resolved.error);
      setAmountInvalid(true);
      return;
    }

    setError("");
    setAmountInvalid(false);
    setSubmitting(true);
    try {
      const payment = await createOpenLinkPayment(slug, { amount: resolved.amount, note: note.trim() });
      if (!isUuid(payment.id)) throw new Error(START_FAILED);
      // The checkout page takes it from here: app hand-off, status, receipt.
      navigate(`/pay/${payment.id}`);
    } catch (err) {
      if (isOpenLinkClosedError(err)) {
        onClosed();
        return;
      }
      setError(err instanceof Error ? err.message : START_FAILED);
      setSubmitting(false);
    }
  };

  return (
    <>
      {link.mode === "test" && <TestModeBanner />}
      <MerchantName name={link.merchantName} />
      <h1 className="mt-2 text-2xl font-bold text-slate-900 wrap-anywhere">{link.label}</h1>

      <form onSubmit={submit} noValidate className="mt-6 space-y-4 text-left">
        <div>
          <label htmlFor="link-amount" className="mb-1.5 block text-sm font-medium text-slate-700">
            Amount
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base text-slate-500">
              ₦
            </span>
            <input
              id="link-amount"
              name="amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              placeholder="0.00"
              aria-invalid={amountInvalid || undefined}
              aria-describedby={amountInvalid ? "link-amount-hint link-error" : "link-amount-hint"}
              className={`${INPUT_CLASS} pl-9`}
            />
          </div>
          <p id="link-amount-hint" className="mt-1.5 text-xs text-slate-500">
            {link.minAmount > 0
              ? `Between ${formatKobo(link.minAmount)} and ${formatKobo(link.maxAmount)}`
              : `Up to ${formatKobo(link.maxAmount)}`}
          </p>
        </div>

        <div>
          <label htmlFor="link-note" className="mb-1.5 block text-sm font-medium text-slate-700">
            What&apos;s it for? <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="link-note"
            name="note"
            type="text"
            maxLength={NOTE_MAX_LENGTH}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. 2 bags of rice"
            className={INPUT_CLASS}
          />
        </div>

        {error && (
          <p
            id="link-error"
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 wrap-anywhere"
          >
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Continue
        </Button>
      </form>

      <GetTheApp />
    </>
  );
}
