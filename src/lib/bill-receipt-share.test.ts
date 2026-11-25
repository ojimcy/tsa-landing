import { describe, expect, it } from "vitest";
import { billReceiptCard, billReceiptShareMeta, groupToken, parseBillReceiptPath, type PublicBillReceipt } from "./bill-receipt-share";

const airtime: PublicBillReceipt = {
  code: "TSA-7K2QF-M9XWD",
  category: "airtime",
  providerName: "MTN",
  recipient: "08068157741",
  amount: 1000,
  paidAt: "2026-11-25T13:32:00Z",
  payerInitials: "O.E.",
};

describe("billReceiptCard", () => {
  it("shows an airtime receipt with the number", () => {
    const card = billReceiptCard(airtime, "https://tsaconnectworld.com/b/TSA-7K2QF-M9XWD");
    expect(card.amount).toBe("₦1,000");
    expect(card.subline).toBe("MTN airtime to 0806 815 7741");
    expect(card.rows.map(([l]) => l)).toEqual(["Network", "Phone number", "Paid by", "Paid on", "Receipt code"]);
    expect(card.rows.find(([l]) => l === "Phone number")?.[1]).toBe("0806 815 7741");
  });

  it("leads an electricity receipt with the token, grouped in fours", () => {
    const card = billReceiptCard(
      { ...airtime, category: "electricity", providerName: "Ikeja Electric", recipient: "45021187336", customerName: "ADEYEMI O. K.", meterType: "prepaid", token: "47291038556290143387" },
      "https://tsaconnectworld.com/b/x",
    );
    expect(card.rows[0]).toEqual(["Token", "4729 1038 5562 9014 3387", true]);
    expect(card.subline).toBe("Electricity for ADEYEMI O. K.");
    expect(card.rows.map(([l]) => l)).toContain("Meter type");
  });
});

describe("parseBillReceiptPath", () => {
  it("reads a /b/ code and nothing else", () => {
    expect(parseBillReceiptPath("/b/TSA-7K2QF-M9XWD")).toBe("7K2QFM9XWD");
    expect(parseBillReceiptPath("/r/TSA-7K2QF-M9XWD")).toBeNull();
    expect(parseBillReceiptPath("/b/nope")).toBeNull();
  });
});

describe("share meta / token", () => {
  it("titles the preview with the amount", () => {
    const card = billReceiptCard(airtime, "https://tsaconnectworld.com/b/TSA-7K2QF-M9XWD");
    const meta = billReceiptShareMeta(card, "https://tsaconnectworld.com", "7K2QFM9XWD");
    expect(meta.title).toBe("Receipt: ₦1,000 airtime");
    expect(meta.image).toMatch(/^https:\/\/tsaconnectworld\.com\/og\/b\/TSA-7K2QF-M9XWD\.png\?v=/);
  });

  it("leaves a non-numeric token alone", () => {
    expect(groupToken("ABC-123")).toBe("ABC-123");
  });
});
