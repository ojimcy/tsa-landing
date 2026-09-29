// What a shared /pay link shows in a chat preview (WhatsApp, iMessage, X, Slack):
// the page's meta tags and the card image. Chat crawlers don't run the page's
// JavaScript, so Netlify edge functions build both from the API on the server.
// Only relative .ts imports, so the edge functions (Deno) can load this file.
import {
  formatKobo,
  formatLagosDateTime,
  isLinkSlug,
  isUuid,
  paymentPurpose,
  type PublicOpenLink,
  type PublicPayment,
} from "./pay-core.ts";

/** What the preview card image shows. */
export type PayCard = {
  merchant?: string;
  amount?: string;
  purpose?: string;
  /** The payment can no longer be made, or already has been. */
  badge?: "Paid" | "Expired" | "Cancelled" | "Failed" | "Closed";
  test: boolean;
};

export type ShareMeta = {
  title: string;
  description: string;
  url: string;
  image: string;
};

type PayPage = { kind: "payment"; id: string } | { kind: "open"; slug: string };

/** A /pay/:id or /pay/l/:slug path, or null for anything else. */
export function parsePayPath(pathname: string): PayPage | null {
  const open = /^\/pay\/l\/([^/]+)\/?$/.exec(pathname);
  if (open) return isLinkSlug(open[1]) ? { kind: "open", slug: open[1] } : null;
  const payment = /^\/pay\/([^/]+)\/?$/.exec(pathname);
  return payment && isUuid(payment[1]) ? { kind: "payment", id: payment[1] } : null;
}

/** Shortened to `max` characters, counting an emoji as one so none is cut in half. */
function clip(s: string | undefined, max: number): string | undefined {
  const chars = Array.from(s ?? "");
  return chars.length > max ? `${chars.slice(0, max - 1).join("").trimEnd()}…` : s || undefined;
}

function paymentBadge(p: PublicPayment): PayCard["badge"] {
  if (p.cancelled) return "Cancelled";
  if (p.status === "succeeded") return "Paid";
  if (p.status === "expired") return "Expired";
  if (p.status === "failed") return "Failed";
  return undefined;
}

// The customer's name and note are left out: a link gets forwarded, and the
// preview is seen by everyone in the chat.
export function paymentCard(p: PublicPayment): PayCard {
  return {
    merchant: clip(p.merchantName, 48),
    amount: formatKobo(p.customerTotal),
    purpose: clip(paymentPurpose(p).paidFor, 90),
    badge: paymentBadge(p),
    test: p.mode === "test",
  };
}

export function openLinkCard(l: PublicOpenLink): PayCard {
  return {
    merchant: clip(l.merchantName, 48),
    amount: l.minAmount === l.maxAmount ? formatKobo(l.minAmount) : undefined,
    purpose: clip(l.label, 90),
    badge: l.active ? undefined : "Closed",
    test: l.mode === "test",
  };
}

/** The card for a link we couldn't read: plain TSA Pay branding, nothing claimed. */
export const GENERIC_CARD: PayCard = { test: false };

const PAY_IN_APP = "Pay securely with TSA Pay in the TSA Connect app.";

function words(card: PayCard, openUntil: string | null): { title: string; description: string } {
  const m = card.merchant;
  if (!m) return { title: "TSA Pay — secure checkout", description: PAY_IN_APP };
  const purpose = card.purpose ? `${card.purpose}. ` : "";
  switch (card.badge) {
    case "Paid":
      return { title: `Paid to ${m}`, description: `${purpose}This payment has been completed.` };
    case "Cancelled":
      return { title: `Payment link from ${m}`, description: `This link was cancelled by ${m}. Ask them for a new one.` };
    case "Expired":
    case "Failed":
    case "Closed":
      return { title: `Payment link from ${m}`, description: `This link is no longer taking payments. Ask ${m} for a new one.` };
  }
  const title = card.amount ? `Pay ${card.amount} to ${m}` : `Pay ${m}`;
  const enterAmount = card.amount ? "" : "Enter your amount and pay securely with TSA Pay in the TSA Connect app.";
  const until = openUntil ? ` Open until ${openUntil}.` : "";
  return { title, description: `${purpose}${enterAmount || PAY_IN_APP}${until}` };
}

/**
 * A short hash of the card, put on the image URL: chat apps cache a preview
 * image by URL, so a link that gets paid or expires needs a new one.
 */
export function cardVersion(card: PayCard): string {
  let h = 0x811c9dc5;
  for (const ch of JSON.stringify(card)) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  return (h >>> 0).toString(36);
}

/** The card image for the pay page at `payPath`, e.g. /pay/l/shop-12 → /og/pay/l/shop-12.png?v=… */
export function ogImageUrl(origin: string, payPath: string, card: PayCard): string {
  return `${origin}/og${payPath.replace(/\/$/, "")}.png?v=${cardVersion(card)}`;
}

/** When a payment link stops taking payments, if it hasn't already. */
function openUntil(payment: PublicPayment | undefined, now: number): string | null {
  if (!payment || payment.status !== "pending" || payment.source === "open") return null;
  return Date.parse(payment.expiresAt) > now ? formatLagosDateTime(payment.expiresAt) : null;
}

/** The meta for the pay page at `url`; `payment` gives a payment link's closing time. */
export function shareMeta(card: PayCard, url: URL, payment?: PublicPayment, now = Date.now()): ShareMeta {
  const { title, description } = words(card, openUntil(payment, now));
  return {
    title: card.test ? `[Test] ${title}` : title,
    description,
    url: `${url.origin}${url.pathname}`,
    image: ogImageUrl(url.origin, url.pathname, card),
  };
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const SHARE_META = /<!-- share-meta[\s\S]*?<!-- \/share-meta -->/;

/**
 * index.html with its site-wide meta block swapped for `tags`. A function
 * replacement: a string one would read "$'" or "$&" in a merchant's name as
 * a pattern and paste parts of the page into the tags.
 */
export function injectShareMeta(html: string, tags: string): string {
  return html.replace(SHARE_META, () => tags);
}

// The crawlers that build chat and social link previews. Only they get the
// per-link meta, so a payer's page never waits on the API for it.
const LINK_PREVIEW_BOT =
  /whatsapp|facebookexternalhit|facebot|twitterbot|slackbot|telegrambot|discordbot|linkedinbot|skypeuripreview|pinterest|redditbot|embedly|iframely|viber|snapchat|google-pagerenderer|mastodon|cardyb/i;

export function isLinkPreviewBot(userAgent: string | null): boolean {
  return userAgent !== null && LINK_PREVIEW_BOT.test(userAgent);
}

/** The head tags for a pay page. Payment pages are private to whoever holds the link: never indexed. */
export function metaTags(meta: ShareMeta): string {
  const e = escapeHtml;
  return [
    `<title>${e(meta.title)}</title>`,
    `<meta name="description" content="${e(meta.description)}" />`,
    `<meta name="robots" content="noindex, nofollow" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="TSA Pay" />`,
    `<meta property="og:url" content="${e(meta.url)}" />`,
    `<meta property="og:title" content="${e(meta.title)}" />`,
    `<meta property="og:description" content="${e(meta.description)}" />`,
    `<meta property="og:image" content="${e(meta.image)}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${e(meta.title)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${e(meta.title)}" />`,
    `<meta name="twitter:description" content="${e(meta.description)}" />`,
    `<meta name="twitter:image" content="${e(meta.image)}" />`,
  ].join("\n    ");
}

// Crawlers give up after a few seconds; the generic card is better than none.
const TIMEOUT_MS = 1500;

async function getPublic<T>(apiUrl: string, path: string): Promise<T | null> {
  try {
    const res = await fetch(`${apiUrl}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const body = (await res.json()) as { success?: boolean; data?: T };
    return body.success && body.data ? body.data : null;
  } catch {
    return null;
  }
}

/**
 * The card (and, for a single payment, the payment) behind a pay page path.
 * Anything unreadable — a bad path, a missing link, a slow API — is the
 * generic card, so a preview never fails, it only says less.
 */
export async function loadPayCard(apiUrl: string, pathname: string): Promise<{ card: PayCard; payment?: PublicPayment }> {
  const page = parsePayPath(pathname);
  if (page?.kind === "payment") {
    const payment = await getPublic<PublicPayment>(apiUrl, `/pay/public/${encodeURIComponent(page.id)}`);
    return payment ? { card: paymentCard(payment), payment } : { card: GENERIC_CARD };
  }
  if (page?.kind === "open") {
    const link = await getPublic<PublicOpenLink>(apiUrl, `/pay/public/open/${encodeURIComponent(page.slug)}`);
    return { card: link ? openLinkCard(link) : GENERIC_CARD };
  }
  return { card: GENERIC_CARD };
}
