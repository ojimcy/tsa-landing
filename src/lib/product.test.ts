import { describe, expect, it } from "vitest";
import { productOpenUrl } from "./product";

const ID = "8f27349b-75f3-4a3c-965d-c267b8de2566";

describe("productOpenUrl", () => {
  it("sends Android to the app through an intent that falls back to the Play Store", () => {
    const url = productOpenUrl(ID, "Mozilla/5.0 (Linux; Android 14; SM-S918B) Chrome/131.0 Mobile");
    expect(url).toBe(
      `intent://product/${ID}#Intent;scheme=tsaconnect;package=com.tsaconnectworld.mobile;` +
        `S.browser_fallback_url=${encodeURIComponent("https://play.google.com/store/apps/details?id=com.tsaconnectworld.mobile")};end`,
    );
  });

  it("uses the app's own link everywhere else", () => {
    expect(productOpenUrl(ID, "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari")).toBe(`tsaconnect://product/${ID}`);
  });
});
