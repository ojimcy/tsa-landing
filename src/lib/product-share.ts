// A shared marketplace listing (tsaconnectworld.com/p/<id>): its chat preview.
// Drawn only from the API's public product read, which returns live listings
// alone. Only relative .ts imports, so the edge functions (Deno) can load it.
import { clip, getPublic, type ShareMeta } from "./pay-share.ts";

export type ProductPreview = {
  id: string;
  name: string;
  description?: string;
  price: number;
  companyName?: string;
  images?: { url?: string }[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The listing id in a /p/:id path, or null for anything else. */
export function parseProductPath(pathname: string): string | null {
  const m = /^\/p\/([^/]+)\/?$/.exec(pathname);
  if (!m) return null;
  const id = decodeURIComponent(m[1]);
  return UUID_RE.test(id) ? id : null;
}

const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export function productShareMeta(product: ProductPreview, origin: string): ShareMeta {
  const by = product.companyName ? ` · ${product.companyName}` : "";
  const blurb = clip(product.description?.trim(), 140);
  return {
    title: `${product.name} — ${usd(product.price)}`,
    description: blurb ? `${blurb}${by}` : `On TSA Connect${by}`,
    url: `${origin}/p/${product.id}`,
    image: product.images?.find((i) => i.url)?.url ?? `${origin}/icon-512.png`,
    imageUnsized: true,
    siteName: "TSA Connect",
  };
}

export const loadProductPreview = (apiUrl: string, id: string) =>
  getPublic<ProductPreview>(apiUrl, `/products/${encodeURIComponent(id)}`);
