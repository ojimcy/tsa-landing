import {
  Globe,
  Wrench,
  Wallet,
  ArrowLeftRight,
  Coins,
  Banknote,
  ShieldCheck,
  Receipt,
  Handshake,
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
  founderEmail: "obic@tsaconnectworld.com",
  socialX: "TSA CONNECT",
  socialXUrl: "https://x.com/tsaconnectworld",
  sharesAnchor: "/#private-sale",
  adminUrl: "https://tsaconnectworld.com/admin",
  playStoreUrl:
    "https://play.google.com/store/apps/details?id=com.tsaconnectworld.mobile",
  attribution: [
    { label: "Founder", href: "https://x.com/OBAINO4CHRISTT" },
    { label: "MCGPchain", href: "https://x.com/MCGPchain" },
    { label: "BNP Africa", href: "https://x.com/bnpafrica" },
  ],
};

export const about = {
  companyName: "Obaino4Christ Business International Connectors Ltd",
  companyRc: "RC 1897254",
  launchDate: "July 2026",
  intro:
    "TSA Connect World is owned and operated by Obaino4Christ Business International Connectors Ltd (RC 1897254), a duly registered company dedicated to connecting businesses, creating opportunities, and delivering value through innovative digital solutions.",
  paragraphs: [
    "Our flagship platform, the TSA Connect App, is a non-custodial wallet and decentralized marketplace that enables users to maintain full control of their digital assets. The platform is designed to support stablecoins, crypto-to-fiat swaps, and digital payment services, including Peer-to-Peer (P2P), Payment Merchant (PM), Instant Transfer (IT), and Instant Pay.",
    "To foster a secure and trusted ecosystem, KYC verification is mandatory for participation in the products and services marketplace and for payment services (P2P, PM, IT, and Instant Pay). KYC is not required for decentralized on-chain crypto spot trading and token swaps, where users interact directly with blockchain protocols while retaining custody of their assets.",
    "The platform also provides a marketplace where buyers and merchants can trade products and services (real world marketplace, RWM), together with decentralized on-chain crypto spot and swap trading. Fiat payment and settlement services are intended to be delivered through API integrations with appropriately licensed financial technology providers, enabling secure and compliant payment processing.",
  ],
  mission:
    "Our mission is to build a secure, transparent, and accessible ecosystem that empowers businesses and individuals to connect, transact, and grow with confidence.",
};

export type ContactChannel = {
  title: string;
  description: string;
  email: string;
};

export const contactChannels: ContactChannel[] = [
  {
    title: "Support & Founder",
    description: "General enquiries, partnerships, and founder contact.",
    email: site.founderEmail,
  },
  {
    title: "Customer Support",
    description: "Help with your account, wallet, or a transaction.",
    email: site.supportEmail,
  },
];

export const hero = {
  eyebrow: "Welcome to TSA Connect",
  headline: "Connect The World",
  subheadline:
    "Buy, sell, pay, swap, and earn — globally, with stablecoins, on a decentralized marketplace built for the way you actually live. Cash out to your bank in minutes.",
  primaryCta: { label: "Get it on Google Play", href: site.playStoreUrl },
  secondaryCta: { label: "How it works", href: "#how-it-works" },
  availability: "Available now on Google Play. App Store coming soon.",
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
    title: "Crypto to cash",
    description:
      "Sell USDT or USDC and get naira paid straight into your Nigerian bank account — or buy stablecoins with a simple bank transfer. Live rates, fees shown upfront.",
    icon: Banknote,
  },
  {
    title: "Pay your bills",
    description:
      "Top up airtime and data, pay electricity and cable TV right from the app — no bank card needed.",
    icon: Receipt,
  },
  {
    title: "Easy swap",
    description:
      "Swap across chains in one tap — MCGP, spot pairs, and any token onchain, including everything indexed on CoinMarketCap, CoinGecko, and Dexscreener.",
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
      "Trade directly with approved P2P traders and Payment Merchants, with funds held in onchain escrow until both sides deliver.",
    icon: Handshake,
  },
  {
    title: "Self-custody wallet",
    description:
      "Not your keys, not your coins. One wallet for EVM chains, Solana and Sui — TSA Connect never holds your keys, and KYC keeps the marketplace safe.",
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
  /** Set once the listing is live; badges without one render as "coming soon". */
  href?: string;
};

export const storeBadges: StoreBadge[] = [
  { store: "Google Play", caption: "Get it on", href: site.playStoreUrl },
  { store: "App Store", caption: "Download on the" },
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
