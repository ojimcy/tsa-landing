import { afterEach, describe, expect, it, vi } from "vitest";
import indexHtml from "../../index.html?raw";
import {
  cardVersion, escapeHtml, injectShareMeta, isLinkPreviewBot, loadPayCard, metaTags, ogImageUrl, parsePayPath, paymentCard, shareMeta, GENERIC_CARD,
} from "@/lib/pay-share";
import type { PublicOpenLink, PublicPayment } from "@/lib/pay-core";

const ID = "5f5a1c2e-8b3d-4e6f-9a0b-1c2d3e4f5a6b";
const url = new URL(`https://tsaconnectworld.com/pay/${ID}`);
const beforeExpiry = Date.parse("2026-10-01T00:00:00Z");

const payment: PublicPayment = {
  id: ID,
  merchantName: "Sky Air Ltd",
  status: "pending",
  amount: 5_000_000,
  customerTotal: 5_050_000,
  currency: "NGN",
  expiresAt: "2026-10-03T13:30:00Z",
  appUrl: "tsaconnect://pay/x",
  source: "link",
  description: "Flight LOS–ABV, 3 Oct",
  customerName: "Ada Obi",
};

const openLink: PublicOpenLink = { merchantName: "Mama Ngozi Store", label: "Shop 12", minAmount: 10_000, maxAmount: 50_000_000, active: true };

function stubApi(body: unknown, status = 200) {
  const f = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", f);
  return f;
}

afterEach(() => vi.unstubAllGlobals());

describe("pay link share preview", () => {
  it("reads only real pay pages", () => {
    expect(parsePayPath(`/pay/${ID}`)).toEqual({ kind: "payment", id: ID });
    expect(parsePayPath("/pay/l/shop-12")).toEqual({ kind: "open", slug: "shop-12" });
    expect(parsePayPath("/pay/not-a-uuid")).toBeNull();
    expect(parsePayPath("/pay/l/<script>")).toBeNull();
  });

  it("an unpaid link asks for the amount, to the merchant, with what it's for and until when", async () => {
    stubApi({ success: true, data: payment });
    const { card, payment: p } = await loadPayCard("https://api.test", url.pathname);
    const meta = shareMeta(card, url, p, beforeExpiry);
    expect(meta.title).toBe("Pay ₦50,500.00 to Sky Air Ltd");
    expect(meta.description).toMatch(/^Flight LOS–ABV, 3 Oct\. Pay securely with TSA Pay in the TSA Connect app\. Open until 3 Oct 2026/);
    expect(meta.url).toBe(`https://tsaconnectworld.com/pay/${ID}`);
    expect(meta.image).toBe(`https://tsaconnectworld.com/og/pay/${ID}.png?v=${cardVersion(card)}`);
  });

  it("a link past its closing time doesn't claim to be open until then", () => {
    const afterExpiry = Date.parse("2026-10-04T00:00:00Z");
    expect(shareMeta(paymentCard(payment), url, payment, afterExpiry).description).not.toContain("Open until");
  });

  it("a long description is shortened without cutting an emoji in half", () => {
    const purpose = paymentCard({ ...payment, description: `${"a".repeat(88)}🎉🎉🎉` }).purpose!;
    expect(Array.from(purpose)).toHaveLength(90);
    expect(purpose).toBe(`${"a".repeat(88)}🎉…`);
  });

  it("never shows who was asked to pay: a forwarded link previews for everyone", async () => {
    stubApi({ success: true, data: payment });
    const { card, payment: p } = await loadPayCard("https://api.test", url.pathname);
    expect(JSON.stringify([card, shareMeta(card, url, p)])).not.toContain("Ada Obi");
  });

  it("a paid or expired link says so, and gets a new image URL", async () => {
    stubApi({ success: true, data: payment });
    const pending = (await loadPayCard("https://api.test", url.pathname)).card;
    stubApi({ success: true, data: { ...payment, status: "succeeded" } });
    const paid = await loadPayCard("https://api.test", url.pathname);
    expect(shareMeta(paid.card, url, paid.payment).title).toBe("Paid to Sky Air Ltd");
    expect(cardVersion(paid.card)).not.toBe(cardVersion(pending));

    stubApi({ success: true, data: { ...payment, status: "expired", cancelled: true } });
    const cancelled = await loadPayCard("https://api.test", url.pathname);
    expect(shareMeta(cancelled.card, url, cancelled.payment).description).toBe("This link was cancelled by Sky Air Ltd. Ask them for a new one.");
  });

  it("a reusable link asks the payer for their amount", async () => {
    const f = stubApi({ success: true, data: openLink });
    const { card } = await loadPayCard("https://api.test", "/pay/l/shop-12");
    expect(f).toHaveBeenCalledWith("https://api.test/pay/public/open/shop-12", expect.anything());
    const meta = shareMeta(card, new URL("https://tsaconnectworld.com/pay/l/shop-12"));
    expect(meta.title).toBe("Pay Mama Ngozi Store");
    expect(meta.description).toBe("Shop 12. Enter your amount and pay securely with TSA Pay in the TSA Connect app.");
  });

  it("test-mode links are marked as tests", async () => {
    stubApi({ success: true, data: { ...payment, mode: "test" } });
    const { card, payment: p } = await loadPayCard("https://api.test", url.pathname);
    expect(shareMeta(card, url, p).title).toBe("[Test] Pay ₦50,500.00 to Sky Air Ltd");
  });

  it("a link the API can't give is the plain TSA Pay card, never an error", async () => {
    stubApi({ success: false, message: "payment not found" }, 404);
    expect((await loadPayCard("https://api.test", url.pathname)).card).toBe(GENERIC_CARD);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network"); }));
    expect((await loadPayCard("https://api.test", url.pathname)).card).toBe(GENERIC_CARD);
    expect(shareMeta(GENERIC_CARD, url).title).toBe("TSA Pay — secure checkout");
  });

  it("only chat and social preview crawlers get the per-link meta", () => {
    for (const ua of ["WhatsApp/2.23.20.0 A", "facebookexternalhit/1.1", "Twitterbot/1.0", "TelegramBot (like TwitterBot)", "Slackbot-LinkExpanding 1.0"]) {
      expect(isLinkPreviewBot(ua)).toBe(true);
    }
    expect(isLinkPreviewBot("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1")).toBe(false);
    expect(isLinkPreviewBot(null)).toBe(false);
  });

  it("the tags replace index.html's site-wide meta, and '$' in a merchant name stays literal", () => {
    const tags = metaTags(shareMeta({ merchant: "Cash$' $& $` Store", amount: "₦1.00", test: false }, url));
    const page = injectShareMeta(indexHtml, tags);
    expect(page).toContain("<title>Pay ₦1.00 to Cash$&#39; $&#38; $` Store</title>");
    expect(page).not.toContain("TSA Connect | Connect The World");
    // Nothing of the page is pasted back in: one root, one app script.
    expect(page.match(/id="root"/g)).toHaveLength(1);
    expect(page.match(/<script/g)).toHaveLength(1);
  });

  it("a page without the meta markers is left as it is", () => {
    expect(injectShareMeta("<head><title>x</title></head>", "<title>y</title>")).toBe("<head><title>x</title></head>");
  });

  it("the image URL is versioned by the card", () => {
    expect(ogImageUrl("https://tsaconnectworld.com", "/pay/l/shop-12/", GENERIC_CARD)).toBe(
      `https://tsaconnectworld.com/og/pay/l/shop-12.png?v=${cardVersion(GENERIC_CARD)}`,
    );
  });

  it("merchant text can't break out of the tags, and pages are kept out of search", () => {
    const html = metaTags(shareMeta({ merchant: `"><script>alert(1)</script>`, amount: "₦1.00", test: false }, url));
    expect(html).not.toContain("<script>");
    expect(html).toContain(escapeHtml(`"><script>`));
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
  });
});
