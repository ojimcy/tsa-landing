import { useId } from "react";
import { QRCodeSVG } from "qrcode.react";
import { PrintButton } from "@/components/pay/pay-code";
import { Button } from "@/components/ui/button";
import { receiptSealSvg } from "@/lib/receipt-seal";

/**
 * The brand seal on a live receipt (spec D13), drawn from the same SVG as the
 * receipt's share image (lib/receipt-seal.ts). The markup is ours alone — an id
 * and fixed shapes, nothing from the API.
 */
export function ReceiptSeal({ className }: { className?: string }) {
  return <span className={`inline-block ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: receiptSealSvg({ ringId: `${useId()}-ring` }) }} />;
}

/** The receipt's share image on this site (netlify/edge-functions/receipt-og.ts): /r/TSA-… → /og/r/TSA-….png. */
function receiptImagePath(verifyUrl: string): string {
  return `/og${new URL(verifyUrl).pathname}.png`;
}

/** A live receipt's proof: the QR that opens its public verify page, the seal, Print / Save as PDF and the share image. */
export function ReceiptProof({ verifyUrl }: { verifyUrl: string }) {
  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <QRCodeSVG value={verifyUrl} size={120} />
        </div>
        <ReceiptSeal className="h-24 w-24 text-brand" />
      </div>
      <p className="text-xs text-slate-500">Verified by TSA Connect · scan the code to check this receipt</p>
      <div className="flex flex-wrap justify-center gap-2 print:hidden">
        <PrintButton label="Print / Save as PDF" />
        <Button asChild variant="outline" size="sm">
          <a href={receiptImagePath(verifyUrl)} download>
            Save receipt image
          </a>
        </Button>
      </div>
    </div>
  );
}
