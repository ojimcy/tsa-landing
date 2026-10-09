import { afterEach, describe, expect, it, vi } from "vitest";
import { metaTags } from "@/lib/pay-share";
import type { PublicReceipt } from "@/lib/pay-core";
import { SITE_ORIGIN, loadReceiptCard, parseReceiptPath, receiptCard, receiptImageUrl, receiptPageUrl, receiptShareMeta } from "@/lib/receipt-share";
import { site } from "@/data/content";
import { receiptSealSvg } from "@/lib/receipt-seal";

const BARE = "8D4DQY4DMN";
const receipt: PublicReceipt = {
  code: "TSA-8D4DQ-Y4DMN",
  merchantName: "Sky Air Ltd",
  amount: 101_011,
  currency: "NGN",
  description: "Flight LOS–ABV, 3 Oct",
  descriptionIsCustomerNote: false,
  paidAt: "2026-09-25T15:09:00Z",
  payerInitials: "E.A.",
  refundStatus: "none",
  refundedAmount: "0.00",
};

function stubApi(body: unknown, status = 200) {
  const f = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", f);
  return f;
}

afterEach(() => vi.unstubAllGlobals());

describe("parseReceiptPath", () => {
  it("reads a /r/ path down to the bare code, however the code was written", () => {
    expect(parseReceiptPath("/r/TSA-8D4DQ-Y4DMN")).toBe(BARE);
    expect(parseReceiptPath("/r/tsa-8d4dq-y4dmn/")).toBe(BARE);
    expect(parseReceiptPath("/r/TSA%208D4DQ%20Y4DMN")).toBe(BARE);
  });

  it("refuses anything that is not one receipt code", () => {
    for (const p of ["/r/", "/r/nope", "/r/TSA-8D4DQ-Y4DMN/extra", "/pay/TSA-8D4DQ-Y4DMN", "/r/%E0%A4%A"]) expect(parseReceiptPath(p)).toBeNull();
  });
});

describe("receiptCard", () => {
  it("is the receipt page's rows: payer by initials, Lagos time, the canonical check link", () => {
    expect(receiptCard(receipt, receiptPageUrl(BARE))).toEqual({
      code: "TSA-8D4DQ-Y4DMN",
      merchant: "Sky Air Ltd",
      amount: "₦1,010.11",
      purpose: { label: "For", text: "Flight LOS–ABV, 3 Oct" },
      payer: "E.A.",
      paidAt: "25 Sept 2026, 16:09 WAT",
      refund: undefined,
      refundLine: undefined,
      verifyUrl: "https://tsaconnectworld.com/r/TSA-8D4DQ-Y4DMN",
    });
  });

  it("labels a customer's note as theirs, clips it, and carries a refund", () => {
    const card = receiptCard(
      { ...receipt, description: "x".repeat(80), descriptionIsCustomerNote: true, refundStatus: "partial", refundedAmount: "1.00" },
      receiptPageUrl(BARE),
    );
    expect(card.purpose?.label).toBe("Customer's note");
    expect(Array.from(card.purpose!.text)).toHaveLength(60);
    expect(card.refund).toBe("partial");
    expect(card.refundLine).toBe("Partly refunded · 1.00 USD");
  });

  it("leaves out rows it has nothing for", () => {
    const card = receiptCard({ ...receipt, description: "  ", payerInitials: "" }, receiptPageUrl(BARE));
    expect(card.purpose).toBeUndefined();
    expect(card.payer).toBeUndefined();
  });
});

describe("receipt image and meta", () => {
  const card = receiptCard(receipt, receiptPageUrl(BARE));

  it("versions the image URL by what it shows, so a refund gets a new one", () => {
    const before = receiptImageUrl("https://tsaconnectworld.com", BARE, card);
    expect(before).toMatch(/^https:\/\/tsaconnectworld\.com\/og\/r\/TSA-8D4DQ-Y4DMN\.png\?v=[0-9a-z]+$/);
    const refunded = receiptCard({ ...receipt, refundStatus: "partial", refundedAmount: "1.00" }, receiptPageUrl(BARE));
    expect(receiptImageUrl("https://tsaconnectworld.com", BARE, refunded)).not.toBe(before);
  });

  it("previews as the receipt: its words, its portrait image, never indexed", () => {
    const meta = receiptShareMeta(card, "https://deploy-preview-3--tsa.netlify.app", BARE);
    expect(meta.title).toBe("Receipt: ₦1,010.11 to Sky Air Ltd");
    expect(meta.description).toBe("Paid 25 Sept 2026, 16:09 WAT · TSA-8D4DQ-Y4DMN · Verified by TSA Connect");
    // The page link is always the real site; the image comes from the deploy that drew it.
    expect(meta.url).toBe("https://tsaconnectworld.com/r/TSA-8D4DQ-Y4DMN");
    expect(meta.image).toMatch(/^https:\/\/deploy-preview-3--tsa\.netlify\.app\/og\/r\//);
    const tags = metaTags(meta);
    expect(tags).toContain('<meta property="og:image:width" content="1080" />');
    expect(tags).toContain('<meta property="og:image:height" content="1350" />');
    expect(tags).toContain('<meta name="robots" content="noindex, nofollow" />');
  });
});

describe("loadReceiptCard", () => {
  it("reads the public receipt by its bare code", async () => {
    const f = stubApi({ success: true, data: receipt });
    const card = await loadReceiptCard("https://api.example/api", BARE);
    expect(f).toHaveBeenCalledWith("https://api.example/api/pay/public/receipt/8D4DQY4DMN", expect.anything());
    expect(card?.merchant).toBe("Sky Air Ltd");
  });

  it("is nothing for a code with no live receipt — never a generic stand-in", async () => {
    stubApi({ success: false, message: "We couldn't find that code." }, 404);
    expect(await loadReceiptCard("https://api.example/api", BARE)).toBeNull();
  });
});

it("pins the same site the rest of the app names (Deno can't load data/content.ts)", () => {
  expect(SITE_ORIGIN).toBe(`https://${site.domain}`);
});

describe("receiptSealSvg", () => {
  it("drops anything from the ring id that could carry markup", () => {
    const svg = receiptSealSvg({ ringId: '«r1»"><script>x</script>' });
    expect(svg).toContain('id="r1scriptxscript"');
    expect(svg).not.toContain("<script>");
  });

  it("is one fixed seal: the ring id and colour are all that vary", () => {
    const svg = receiptSealSvg({ ringId: "r1", color: "#E8A14A", size: 160 });
    expect(svg).toContain('width="160" height="160"');
    expect(svg).toContain('href="#r1"');
    expect(svg).toContain("VERIFIED BY TSA CONNECT · SCAN TO VERIFY ·");
    expect(svg).not.toContain("currentColor");
  });
});
