import { describe, expect, it } from "vitest";
import { metaTags } from "./pay-share";
import { cardImage, parseProductPath, productShareMeta, type ProductPreview } from "./product-share";

const ID = "3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f";
const product: ProductPreview = {
  id: ID,
  name: "Ankara tote bag",
  description: "Hand-stitched, lined, with an inner pocket.",
  price: 12.5,
  companyName: "Ada's Crafts",
  images: [{}, { url: "https://res.cloudinary.com/demo/image/upload/v1/products/tote.jpg" }],
};

describe("parseProductPath", () => {
  it("takes a listing id from /p/:id", () => {
    expect(parseProductPath(`/p/${ID}`)).toBe(ID);
    expect(parseProductPath(`/p/${ID}/`)).toBe(ID);
  });

  it("refuses anything that isn't a listing id", () => {
    expect(parseProductPath("/p/not-an-id")).toBeNull();
    expect(parseProductPath(`/pay/${ID}`)).toBeNull();
    expect(parseProductPath(`/p/${ID}/extra`)).toBeNull();
  });
});

describe("productShareMeta", () => {
  it("names the listing, its price and seller, with its first photo as a 1200x630 card", () => {
    const meta = productShareMeta(product, "https://tsaconnectworld.com");
    expect(meta.title).toBe("Ankara tote bag — $12.50");
    expect(meta.description).toBe("Hand-stitched, lined, with an inner pocket. · Ada's Crafts");
    expect(meta.url).toBe(`https://tsaconnectworld.com/p/${ID}`);
    expect(meta.image).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_1200,h_630,q_auto,f_jpg/v1/products/tote.jpg",
    );
  });

  it("keeps the text on one line and drops a seller name that repeats the listing", () => {
    const meta = productShareMeta(
      { id: ID, name: "Abacha  ", description: "Fresh\n\nevery day", companyName: "Abacha", price: 1.59 },
      "https://tsaconnectworld.com",
    );
    expect(meta.title).toBe("Abacha — $1.59");
    expect(meta.description).toBe("Fresh every day");
  });

  it("falls back to the app icon and a plain line", () => {
    const meta = productShareMeta({ id: ID, name: "Rice", price: 3 }, "https://tsaconnectworld.com");
    expect(meta.description).toBe("On TSA Connect");
    expect(meta.image).toBe("https://tsaconnectworld.com/icon-512.png");
  });

  it("declares the card's JPEG size and type, and names the site TSA Connect", () => {
    const tags = metaTags(productShareMeta(product, "https://tsaconnectworld.com"));
    expect(tags).toContain('<meta property="og:image:type" content="image/jpeg" />');
    expect(tags).toContain('<meta property="og:image:width" content="1200" />');
    expect(tags).toContain('<meta property="og:image:height" content="630" />');
    expect(tags).toContain('content="TSA Connect"');
  });
});

describe("cardImage", () => {
  it("leaves a photo hosted elsewhere as it is, with no size claimed", () => {
    expect(cardImage("https://example.com/a.jpg")).toEqual({ image: "https://example.com/a.jpg", imageUnsized: true });
    const tags = metaTags({ title: "t", description: "d", url: "u", ...cardImage("https://example.com/a.jpg") });
    expect(tags).not.toContain("og:image:width");
  });
});
