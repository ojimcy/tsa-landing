import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { PayLoading, PayNotice, PayShell } from "@/components/pay/pay-shell";
import { ReceiptProof } from "@/components/pay/receipt-proof";
import {
  PayApiError,
  fetchPublicReceipt,
  formatLagosDateTime,
  formatKobo,
  normalizePayCode,
  receiptRefundLine,
  receiptVerifyUrl,
  type PublicReceipt,
} from "@/lib/pay";

const INVALID = "This receipt link isn't valid.";
const NOT_FOUND = "We couldn't find this receipt. Check the link, or ask the business you paid.";

/**
 * tsaconnectworld.com/r/<code> — the public page a receipt's QR opens (spec
 * D12). The API answers only for a succeeded live payment, so everything shown
 * here carries the seal; test payments and anything else are not found.
 */
export default function ReceiptPage() {
  const { code } = useParams<{ code: string }>();
  const bare = code ? normalizePayCode(code) : null;
  const [receipt, setReceipt] = useState<PublicReceipt | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!bare);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!bare) return;
    let cancelled = false;
    fetchPublicReceipt(bare)
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
        <ReceiptView receipt={receipt} verifyUrl={receiptVerifyUrl(bare)} />
      ) : error ? (
        <PayNotice message={error} onRetry={error === NOT_FOUND ? undefined : retry} />
      ) : null}
    </PayShell>
  );
}

export function ReceiptView({ receipt, verifyUrl }: { receipt: PublicReceipt; verifyUrl: string }) {
  const rows: [string, string | null | undefined][] = [
    ["Paid to", receipt.merchantName],
    [receipt.descriptionIsCustomerNote ? "Customer's note:" : "For", receipt.description],
    ["Paid by", receipt.payerInitials],
    ["Paid on", formatLagosDateTime(receipt.paidAt)],
    ["Payment code", receipt.code],
    ["Refund", receiptRefundLine(receipt)],
  ];

  return (
    <>
      <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
      <p className="mt-3 text-base font-semibold text-green-700">Paid</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{formatKobo(receipt.amount)}</p>
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
      <ReceiptProof verifyUrl={verifyUrl} />
    </>
  );
}
