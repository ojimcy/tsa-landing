import { useId } from "react";
import { QRCodeSVG } from "qrcode.react";
import { PrintButton } from "@/components/pay/pay-code";

/**
 * The brand seal on a live receipt (spec D13): the QR beside it, and the page it
 * opens, are the proof — this only says where to check. No legal wording.
 */
export function ReceiptSeal({ className }: { className?: string }) {
  const ring = `${useId()}-ring`;
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Verified by TSA Connect · scan to verify" className={className}>
      <defs>
        <path id={ring} d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
      </defs>
      <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="60" cy="60" r="33" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text fontSize="10" fontWeight="700" letterSpacing="1.1" fill="currentColor">
        <textPath href={`#${ring}`}>VERIFIED BY TSA CONNECT · SCAN TO VERIFY ·</textPath>
      </text>
      <path d="M45 61 l10 10 l20 -22" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A live receipt's proof: the QR that opens its public verify page, the seal, and Print / Save as PDF. */
export function ReceiptProof({ verifyUrl }: { verifyUrl: string }) {
  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <div className="flex items-center justify-center gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <QRCodeSVG value={verifyUrl} size={120} />
        </div>
        <ReceiptSeal className="h-24 w-24 text-brand" />
      </div>
      <p className="text-xs text-slate-500">Verified by TSA Connect · scan the code to check this receipt</p>
      <PrintButton label="Print / Save as PDF" />
    </div>
  );
}
