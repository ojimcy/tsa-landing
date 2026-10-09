// The brand seal on a live receipt (spec D13), as one SVG document: the receipt
// page draws it, and so does the receipt's share image (netlify/edge-functions/
// receipt-og.ts), so the two can never differ. The QR beside it, and the page it
// opens, are the proof — the seal only says where to check. No legal wording.
// Only relative .ts imports (none, here): Deno loads this file.

export const RECEIPT_SEAL_LABEL = "Verified by TSA Connect · scan to verify";

/**
 * The seal in `color`. `ringId` names the circle its words run along and must be
 * unique in the page that draws it; anything but [A-Za-z0-9_-] is dropped from it,
 * so it can never carry markup into the SVG.
 */
export function receiptSealSvg({ ringId: rawRingId, color = "currentColor", size }: { ringId: string; color?: string; size?: number }): string {
  const ringId = rawRingId.replace(/[^A-Za-z0-9_-]/g, "") || "seal-ring";
  const dims = size ? ` width="${size}" height="${size}"` : ` width="100%" height="100%"`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"${dims} role="img" aria-label="${RECEIPT_SEAL_LABEL}">` +
    `<defs><path id="${ringId}" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"/></defs>` +
    `<circle cx="60" cy="60" r="56" fill="none" stroke="${color}" stroke-width="3"/>` +
    `<circle cx="60" cy="60" r="33" fill="none" stroke="${color}" stroke-width="1.5"/>` +
    `<text font-family="Inter, sans-serif" font-size="10" font-weight="700" letter-spacing="1.1" fill="${color}">` +
    `<textPath href="#${ringId}">VERIFIED BY TSA CONNECT · SCAN TO VERIFY ·</textPath></text>` +
    `<path d="M45 61 l10 10 l20 -22" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</svg>`
  );
}
