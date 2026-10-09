// The 1200×630 preview image for a shared /pay link: /og/pay/:id.png and
// /og/pay/l/:slug.png. It is drawn from the API, never from the URL, so nobody
// can make a TSA-branded "pay ₦X to Y" card for a link that doesn't exist.
import type { Config } from "@netlify/edge-functions";
import type { ReactElement } from "react";
import { GENERIC_CARD, loadPayCard, ogImageUrl, parsePayPath, type PayCard } from "../../src/lib/pay-share.ts";
import { h, img, pngResponse, renderPng } from "../lib/og-render.ts";
import { payApiUrl } from "../lib/pay-api.ts";

const WIDTH = 1200;
const HEIGHT = 630;
const INK = "#1a2425";
const GOLD = "#E8A14A";
const MUTED = "#9fb1b2";
const SOFT = "#d5dcdc";

const pill = (text: string, color: string) =>
  h("div", { padding: "8px 20px", borderRadius: 999, border: `2px solid ${color}`, color, fontSize: 26, fontWeight: 700, letterSpacing: 2 }, text);

function cardImage(card: PayCard, logo: string): ReactElement {
  const badges = [card.test && pill("TEST", GOLD), card.badge && pill(card.badge.toUpperCase(), card.badge === "Paid" ? "#4ade80" : "#f87171")];
  const body = card.merchant
    ? [
        h("div", { fontSize: 30, fontWeight: 500, color: MUTED, letterSpacing: 3, textTransform: "uppercase" }, card.merchant),
        h("div", { marginTop: 12, fontSize: card.amount ? 104 : 72, fontWeight: 700, letterSpacing: -2, color: card.badge ? SOFT : "white" }, card.amount ?? "Enter your amount"),
        card.purpose && h("div", { marginTop: 16, fontSize: 36, fontWeight: 500, color: SOFT, lineHeight: 1.3 }, card.purpose),
      ]
    : [
        h("div", { fontSize: 88, fontWeight: 700, letterSpacing: -2 }, "Secure checkout"),
        h("div", { marginTop: 16, fontSize: 36, fontWeight: 500, color: SOFT }, "Pay businesses with TSA Pay"),
      ];

  return h(
    "div",
    { flexDirection: "column", width: "100%", height: "100%", padding: "64px 72px", backgroundImage: `linear-gradient(135deg, ${INK} 0%, #253334 100%)`, color: "white", fontFamily: "Inter" },
    h(
      "div",
      { alignItems: "center", justifyContent: "space-between" },
      h(
        "div",
        { alignItems: "center" },
        img(logo, 64, 64, { borderRadius: 14 }),
        h("div", { marginLeft: 20, fontSize: 34, fontWeight: 700 }, "TSA Pay"),
      ),
      h("div", { gap: 16 }, ...badges.filter(Boolean)),
    ),
    h("div", { flexDirection: "column", flexGrow: 1, justifyContent: "center" }, ...body.filter(Boolean)),
    h(
      "div",
      { alignItems: "center", justifyContent: "space-between", paddingTop: 28, borderTop: "2px solid #33474a", fontSize: 28, fontWeight: 500 },
      h("div", { color: MUTED }, "Pay securely in the TSA Connect app"),
      h("div", { color: GOLD }, "tsaconnectworld.com"),
    ),
  );
}

export default async function payOg(request: Request) {
  const url = new URL(request.url);
  const payPath = url.pathname.replace(/^\/og/, "").replace(/\.png$/, "");
  if (!parsePayPath(payPath)) return new Response("Not found", { status: 404 });

  const { card } = await loadPayCard(payApiUrl(), payPath);
  // Only the URL of the card as it is now gets drawn. Any other ?v= — made up,
  // out of date, or a real card's while the API was briefly down — is sent to
  // it, so every render is cacheable and a stand-in never sits under a real URL.
  const canonical = ogImageUrl(url.origin, payPath, card);
  if (url.href !== canonical) return new Response(null, { status: 302, headers: { location: canonical, "cache-control": "no-store" } });

  const png = await renderPng(url.origin, WIDTH, HEIGHT, ({ logo }) => cardImage(card, logo));
  // A versioned URL never changes; the generic card is short-lived so a link that appears later gets its own.
  return pngResponse(png, card === GENERIC_CARD ? 300 : 7 * 86_400);
}

export const config: Config = { path: "/og/pay/*", cache: "manual" };
