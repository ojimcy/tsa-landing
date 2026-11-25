import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { PayLoading, PayNotice, PayShell } from "@/components/pay/pay-shell";
import { ReceiptProof } from "@/components/pay/receipt-proof";
import { PayApiError, normalizePayCode, requestPayApi } from "@/lib/pay";
import { billReceiptCard, billReceiptPageUrl, type PublicBillReceipt } from "@/lib/bill-receipt-share";

const INVALID = "This receipt link isn't valid.";
const NOT_FOUND = "We couldn't find this receipt. Check the link, or ask whoever shared it.";

/**
 * tsaconnectworld.com/b/<code> — the public page a bill receipt's QR opens.
 * The API answers only for a delivered bill, so everything shown here carries
 * the seal; anything else is not found.
 */
export default function BillReceiptPage() {
  const { code } = useParams<{ code: string }>();
  const bare = code ? normalizePayCode(code) : null;
  const [receipt, setReceipt] = useState<PublicBillReceipt | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!bare);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!bare) return;
    let cancelled = false;
    requestPayApi<PublicBillReceipt>(`/bills/public/receipt/${encodeURIComponent(bare)}`, {}, "Unable to load this receipt. Please try again.")
      .then(
        (r) => {
          if (cancelled) return;
          setReceipt(r);
          setError("");
        },
        (err: unknown) => {
          if (cancelled) return;
          if (err instanceof PayApiError && err.status === 404) setError(NOT_FOUND);
          else setError(err instanceof Error ? err.message : "Unable to load this receipt.");
        },
      )
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bare, retryKey]);

  const retry = () => {
    setError("");
    setLoading(true);
    setRetryKey((k) => k + 1);
  };

  return (
    <PayShell title="Receipt">
      {!bare ? (
        <PayNotice message={INVALID} />
      ) : loading ? (
        <PayLoading label="Loading receipt…" />
      ) : receipt ? (
        <BillReceiptView receipt={receipt} verifyUrl={billReceiptPageUrl(bare)} />
      ) : error ? (
        <PayNotice message={error} onRetry={error === NOT_FOUND ? undefined : retry} />
      ) : null}
    </PayShell>
  );
}

export function BillReceiptView({ receipt, verifyUrl }: { receipt: PublicBillReceipt; verifyUrl: string }) {
  const card = billReceiptCard(receipt, verifyUrl);
  return (
    <>
      <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
      <p className="mt-3 text-base font-semibold text-green-700">Delivered</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{card.amount}</p>
      <p className="mt-1 text-sm text-slate-500">{card.subline}</p>
      <dl className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 text-left text-sm">
        {card.rows.map(([label, value, strong]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-slate-500">{label}</dt>
            <dd className={`min-w-0 text-right text-slate-900 wrap-anywhere ${strong ? "font-bold tracking-wide" : "font-medium"}`}>{value}</dd>
          </div>
        ))}
      </dl>
      <ReceiptProof verifyUrl={verifyUrl} />
    </>
  );
}
