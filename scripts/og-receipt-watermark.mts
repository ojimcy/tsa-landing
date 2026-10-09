// Renders the receipt image's watermark (receiptWatermark in
// netlify/lib/receipt-image.ts) once, into
// public/og-assets/receipt-watermark.png. Drawing its ~1,100 rotated glyphs
// takes resvg seconds of CPU, so the receipt-og function places this PNG instead.
// Re-run after changing the watermark:
//   node --experimental-strip-types scripts/og-receipt-watermark.mts
import { readFile, writeFile } from "node:fs/promises";
import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { receiptWatermark } from "../netlify/lib/receipt-image.ts";

const root = new URL("..", import.meta.url);
const file = (path: string) => readFile(new URL(path, root));

await initWasm(await file("node_modules/@resvg/resvg-wasm/index_bg.wasm"));
const bold = await file("public/og-assets/Inter-Bold.ttf");
const svg = await satori(receiptWatermark(), {
  width: 1080,
  height: 1350,
  fonts: [{ name: "Inter", data: bold, weight: 700, style: "normal" }],
});
const png = new Resvg(svg).render().asPng();
await writeFile(new URL("public/og-assets/receipt-watermark.png", root), png);
console.log(`receipt-watermark.png: ${png.length} bytes`);
