import {
  Globe,
  Wrench,
  Wallet,
  ArrowLeftRight,
  Coins,
  Banknote,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import mockupHome from "@/assets/screenshots/mockup-home.svg";
import mockupMarketplace from "@/assets/screenshots/mockup-marketplace.svg";
import mockupWallet from "@/assets/screenshots/mockup-wallet.svg";
import mockupSwap from "@/assets/screenshots/mockup-swap.svg";

export const site = {
  name: "TSA Connect",
  tagline: "Connect The World",
  domain: "tsaconnectworld.com",
  supportEmail: "support@tsaconnectworld.com",
  socialX: "TSA CONNECT",
  socialXUrl: "https://x.com/tsaconnectworld",
  sharesUrl: "https://tsaconnectworld.com/shares",
  adminUrl: "https://tsaconnectworld.com/admin",
  attribution: [
    { label: "Founder", href: "https://x.com/OBAINO4CHRISTT" },
    { label: "MCGPchain", href: "https://x.com/MCGPchain" },
    { label: "BNP Africa", href: "https://x.com/bnpafrica" },
  ],
};

export const hero = {
  eyebrow: "Welcome to TSA Connect",
  headline: "Connect The World",
  subheadline:
    "Buy, sell, pay, swap, and earn — globally, with stablecoins, on a decentralized marketplace built for the way you actually live.",
  primaryCta: { label: "Get the app — coming soon", href: "#download" },
  secondaryCta: { label: "How it works", href: "#how-it-works" },
};

export type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const features: Feature[] = [
  {
    title: "Borderless commerce",
    description:
      "Buy and sell products with direct delivery to your door — across the city, across states, or across borders — settled instantly onchain.",
    icon: Globe,
  },
  {
    title: "Services on demand",
    description:
      "Order or offer any service: spa, restaurant, mechanics, taxi, healthcare, education, cleaning and more, anywhere in the world.",
    icon: Wrench,
  },
  {
    title: "Instant crypto pay",
    description:
      "Pay supermarkets, pharmacies, hotels, and any registered merchant by username — using stablecoins or supported crypto, no fiat needed.",
    icon: Wallet,
  },
  {
    title: "Easy swap",
    description:
      "Swap MCGP assets, listed spot pairs, and any token onchain — including everything indexed on CoinMarketCap, CoinGecko, and Dexscreener.",
    icon: ArrowLeftRight,
  },
  {
    title: "TradePoint rewards",
    description:
      "Earn TradePoints (TP) and instant cashback on every transaction — purchases, services, payments, and swaps. Your spending becomes growth.",
    icon: Coins,
  },
  {
    title: "P2P & merchant ramp",
    description:
      "Move between fiat and crypto seamlessly through approved P2P traders and Payment Merchants — secure on/off-ramp, no friction.",
    icon: Banknote,
  },
  {
    title: "Self-custody wallet",
    description:
      "Not your keys, not your coins. TSA Connect doesn't custody funds — you own your wallet and marketplace, with KYC keeping you protected.",
    icon: ShieldCheck,
  },
];

export type Step = {
  title: string;
  description: string;
  screenshot: string;
};

export const steps: Step[] = [
  {
    title: "Open the app",
    description: "See your portfolio, assets, and quick actions at a glance — Buy, Services, Trade, Wallet.",
    screenshot: mockupHome,
  },
  {
    title: "Browse the marketplace",
    description: "Search products and services across categories — bakery, electronics, cars, and more.",
    screenshot: mockupMarketplace,
  },
  {
    title: "Manage your wallet",
    description: "Fund, swap, send, or pay instantly. Track balances across stablecoins and supported chains.",
    screenshot: mockupWallet,
  },
  {
    title: "Swap & trade",
    description: "Move between MCGP, USDC, USDT and more — OTC, spot, and onchain swaps in one place.",
    screenshot: mockupSwap,
  },
];

export type StoreBadge = {
  store: string;
  caption: string;
};

export const storeBadges: StoreBadge[] = [
  { store: "App Store", caption: "Download on the" },
  { store: "Google Play", caption: "Get it on" },
  { store: "Amazon Appstore", caption: "Available at" },
];

export const privateSale = {
  title: "Private Share Sales",
  batch: "Batch 1",
  batchPeriod: "1st – 7th May, 2026",
  price: "$0.002",
  priceUnit: "per share unit",
  duration: "7 days",
  supportedCurrencies: ["BNB", "USDT", "USDC"],
  supportedNetworks: ["BNB Chain", "Sonic Network"],
  depositAddress: "0x2a88C3e5328015Bd5A79574fB1683dda6bA60A0D",
  minimumBuy: "$100",
};
