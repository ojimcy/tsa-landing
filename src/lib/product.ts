// A marketplace listing's public view, for the share page (/p/:id). The app
// shares this page's URL; the page hands the visitor on to the app.
import { requestPayApi } from "@/lib/pay";
import { site } from "@/data/content";

export interface PublicProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  kind?: "general" | "digital";
  categoryName?: string;
  companyName?: string;
  images?: { url?: string }[];
  digital?: {
    creatorName?: string;
    licence?: "personal" | "commercial";
    preview?: { kind?: string } | null;
  };
}

export const PRODUCT_LOAD_ERROR = "We couldn't load this product. Please try again.";
export const PRODUCT_GONE = "This product isn't available any more.";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isProductId = (id: string) => UUID_RE.test(id);

/** Plain GET, no headers: preflight-free. Unauthenticated, so only live listings come back. */
export function fetchPublicProduct(id: string): Promise<PublicProduct> {
  return requestPayApi(`/products/${encodeURIComponent(id)}`, {}, PRODUCT_LOAD_ERROR);
}

/** Opens the installed app on this listing (the app's registered scheme). */
export const productAppUrl = (id: string) => `tsaconnect://product/${encodeURIComponent(id)}`;

/**
 * Android's form of the same link: Chrome opens the installed app on the
 * listing, or the Play Store when it isn't installed (a bare tsaconnect:// link
 * does nothing there). Only for Android: other browsers don't know intent://.
 */
export const productAndroidIntentUrl = (id: string) =>
  `intent://product/${encodeURIComponent(id)}#Intent;scheme=tsaconnect;package=com.tsaconnectworld.mobile;` +
  `S.browser_fallback_url=${encodeURIComponent(site.playStoreUrl)};end`;

/** The link "Open in TSA Connect" follows on this device. */
export const productOpenUrl = (id: string, userAgent: string) =>
  /Android/i.test(userAgent) ? productAndroidIntentUrl(id) : productAppUrl(id);

export const formatUsd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
