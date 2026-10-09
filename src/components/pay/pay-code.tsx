import { Button } from "@/components/ui/button";
import { useCopy } from "@/hooks/use-copy";

/** Prints the page; the browser's print dialog also saves it as a PDF. Never printed itself. */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
      {label}
    </Button>
  );
}

/**
 * A payment's code, to copy or read out — and, while it can still be paid, how
 * to pay it in the app with it.
 */
export function PayCodeLine({ code, payable }: { code: string; payable: boolean }) {
  const { status, copy } = useCopy();

  return (
    <div className="mt-4 rounded-xl border border-slate-200 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Payment code</p>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <span className="font-mono text-lg font-semibold tracking-wider text-slate-900">{code}</span>
        <Button variant="ghost" size="sm" className="print:hidden" aria-label="Copy payment code" onClick={() => copy(code)}>
          {status === "copied" ? "Copied" : "Copy"}
        </Button>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {status === "copied" ? "Copied" : status === "failed" ? "Couldn't copy" : ""}
      </p>
      {payable && (
        <p className="mt-1 text-xs text-slate-500">Or pay in the TSA Connect app: tap Pay on the home screen and enter this code</p>
      )}
    </div>
  );
}
