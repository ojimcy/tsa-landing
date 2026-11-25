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

// WhatsApp draws no thumbnail for an unsized, full-resolution photo. A
// Cloudinary listing photo is served as the same 1200x630 JPEG a pay card is.
const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const CLOUDINARY_UPLOAD = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;

export function cardImage(url: string): Pick<ShareMeta, "image" | "imageWidth" | "imageHeight" | "imageType" | "imageUnsized"> {
  const m = CLOUDINARY_UPLOAD.exec(url);
  if (!m) return { image: url, imageUnsized: true };
  const transform = `c_fill,g_auto,w_${CARD_WIDTH},h_${CARD_HEIGHT},q_auto,f_jpg/`;
  return {
    image: m[0] + transform + url.slice(m[0].length),
    imageWidth: CARD_WIDTH,
    imageHeight: CARD_HEIGHT,
    imageType: "image/jpeg",
  };
}

const oneLine = (s: string | undefined) => s?.replace(/\s+/g, " ").trim() || undefined;

export function productShareMeta(product: ProductPreview, origin: string): ShareMeta {
  const name = oneLine(product.name) ?? "Product";
  const seller = oneLine(product.companyName);
  const by = seller && seller !== name ? ` · ${seller}` : "";
  const blurb = clip(oneLine(product.description), 140);
  const photo = product.images?.find((i) => i.url)?.url;
  return {
    title: `${name} — ${usd(product.price)}`,
    description: blurb ? `${blurb}${by}` : `On TSA Connect${by}`,
    url: `${origin}/p/${product.id}`,
    ...(photo ? cardImage(photo) : { image: `${origin}/icon-512.png`, imageUnsized: true }),
    siteName: "TSA Connect",
  };
}

export const loadProductPreview = (apiUrl: string, id: string) =>
  getPublic<ProductPreview>(apiUrl, `/products/${encodeURIComponent(id)}`);
