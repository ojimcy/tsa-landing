// Outside the function folders so Netlify doesn't take it for a function: what
// the share cards draw with (the pay-og edge function, the receipt-og function)
// — satori lays a card out as SVG and resvg turns it into a PNG, both with the
// site's own fonts and logo. Runtime-neutral: it runs under Deno and Node.
import type { CSSProperties, ReactElement, ReactNode } from "react";
import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";

type Assets = { medium: ArrayBuffer; bold: ArrayBuffer; logo: string };

/** `load` run once per instance; a failure is retried by the next call rather than kept. */
export function once<T>(load: (origin: string) => Promise<T>): (origin: string) => Promise<T> {
  let pending: Promise<T> | undefined;
  return (origin) => {
    if (pending) return pending;
    const p = load(origin);
    p.catch(() => {
      if (pending === p) pending = undefined;
    });
    return (pending = p);
  };
}

// Fonts, logo and the resvg wasm are the site's own static files (the wasm is
// copied from node_modules at build). The wasm can be initialised only once,
// so it has its own loader.
const get = (origin: string, path: string) =>
  fetch(`${origin}${path}`).then((r) => {
    if (!r.ok) throw new Error(`${path}: ${r.status}`);
    return r.arrayBuffer();
  });

/** One of the site's own image files as a data: URI, fetched once per instance. */
export function siteImage(path: string, type = "image/png"): (origin: string) => Promise<string> {
  return once(async (origin) => dataUri(type, new Uint8Array(await get(origin, path))));
}

const loadWasm = once((origin) => get(origin, "/og-assets/resvg.wasm").then((wasm) => initWasm(wasm)));

const loadAssets = once(async (origin): Promise<Assets> => {
  const [medium, bold, png] = await Promise.all(["/og-assets/Inter-Medium.ttf", "/og-assets/Inter-Bold.ttf", "/icon-512.png"].map((p) => get(origin, p)));
  return { medium, bold, logo: dataUri("image/png", new Uint8Array(png)) };
});

/** `bytes` as a base64 data: URI. */
export function dataUri(type: string, bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${type};base64,${btoa(binary)}`;
}

/** An SVG document as an image satori can place: nested SVG is drawn by resvg, text included. */
export function svgImage(svg: string): string {
  return dataUri("image/svg+xml", new TextEncoder().encode(svg));
}

/** A satori node: a flex box unless the style says otherwise. */
export function h(type: string, style: CSSProperties, ...children: ReactNode[]): ReactElement {
  return { type, key: null, props: { style: { display: "flex", ...style }, children } };
}

/** A satori image node. */
export function img(src: string, width: number, height: number, style: CSSProperties = {}): ReactElement {
  return { type: "img", key: null, props: { src, width, height, style } };
}

/** What a card is drawn with: the logo, and a way to rasterise an SVG that carries text. */
export type CardKit = {
  logo: string;
  /**
   * `svg` as a PNG data: URI, its text set in the site's fonts. resvg draws a
   * nested SVG image's shapes but skips its text (the receipt seal's ring), so
   * an SVG with words in it is rasterised first; plain shapes (a QR) need not be.
   */
  raster: (svg: string) => string;
};

/** `card(kit)` drawn at width×height as a PNG. */
export async function renderPng(origin: string, width: number, height: number, card: (kit: CardKit) => ReactElement): Promise<Uint8Array<ArrayBuffer>> {
  const [{ medium, bold, logo }] = await Promise.all([loadAssets(origin), loadWasm(origin)]);
  const fontBuffers = [new Uint8Array(medium), new Uint8Array(bold)];
  const raster = (svg: string) => dataUri("image/png", new Resvg(svg, { font: { fontBuffers, defaultFontFamily: "Inter" } }).render().asPng());
  const svg = await satori(card({ logo, raster }), {
    width,
    height,
    fonts: [
      { name: "Inter", data: medium, weight: 500, style: "normal" },
      { name: "Inter", data: bold, weight: 700, style: "normal" },
    ],
  });
  // Copied into a plain ArrayBuffer-backed array, the only kind Response takes.
  return new Uint8Array(new Resvg(svg).render().asPng());
}

/** A rendered card as the response every share-card URL answers with. */
export function pngResponse(png: Uint8Array<ArrayBuffer>, maxAge: number): Response {
  return new Response(png, {
    headers: {
      "content-type": "image/png",
      "cache-control": `public, max-age=${maxAge}`,
      "netlify-cdn-cache-control": `public, s-maxage=${maxAge}`,
      "x-robots-tag": "noindex",
    },
  });
}
