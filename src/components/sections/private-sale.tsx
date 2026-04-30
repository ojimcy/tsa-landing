import { useState } from "react";
import { Copy, Check, Wallet, Coins, Calendar, Network, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/reveal";
import { privateSale } from "@/data/content";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export function PrivateSale() {
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", amount: "", txHash: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(privateSale.depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = privateSale.depositAddress;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/private-sale/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSubmitted(true);
      } else {
        setError(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Unable to reach the server. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="private-sale"
      className="relative overflow-hidden bg-gradient-to-b from-white via-amber-50/30 to-white py-20 sm:py-24"
    >
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-soft/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-soft/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand">
              Presale
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {privateSale.title}
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Be among the first to own shares in the TSA Connect ecosystem.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Reveal delay={80}>
            <Card className="h-full border-brand/10 shadow-sm">
              <CardHeader className="flex-row items-center gap-3 space-y-0 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10">
                  <Calendar className="h-5 w-5 text-brand" />
                </div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Current Batch
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-brand">{privateSale.batch}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {privateSale.batchPeriod}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Duration: {privateSale.duration}
                </p>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={160}>
            <Card className="h-full border-brand/10 shadow-sm">
              <CardHeader className="flex-row items-center gap-3 space-y-0 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10">
                  <Coins className="h-5 w-5 text-brand" />
                </div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Price
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-brand">
                  {privateSale.price}{" "}
                  <span className="text-sm font-normal text-slate-500">
                    {privateSale.priceUnit}
                  </span>
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Minimum buy: {privateSale.minimumBuy}
                </p>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={240} className="sm:col-span-2 lg:col-span-1">
            <Card className="h-full border-brand/10 shadow-sm">
              <CardHeader className="flex-row items-center gap-3 space-y-0 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10">
                  <Network className="h-5 w-5 text-brand" />
                </div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Supported
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Currencies</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {privateSale.supportedCurrencies.map((cur) => (
                        <span
                          key={cur}
                          className="inline-flex items-center rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand"
                        >
                          {cur}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Networks</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {privateSale.supportedNetworks.map((net) => (
                        <span
                          key={net}
                          className="inline-flex items-center rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand"
                        >
                          {net}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>

        <div className="my-12 border-t border-slate-200" />

        <Reveal delay={200}>
          <Card className="mx-auto max-w-2xl border-brand/10 bg-gradient-to-br from-brand/5 to-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Wallet className="h-4 w-4 text-brand" />
                Deposit Address
              </CardTitle>
              <p className="text-xs text-slate-500">
                Send BNB, USDT, or USDC (BNB Chain / Sonic) to the address below, then
                fill out the form.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
                <code className="flex-1 break-all text-xs font-mono text-slate-700">
                  {privateSale.depositAddress}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAddress}
                  className="shrink-0"
                  aria-label="Copy address"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </Reveal>

        {!submitted ? (
          <Reveal delay={280}>
            <Card className="mx-auto mt-8 max-w-2xl border-brand/10 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Submit Your Details
                </CardTitle>
                <p className="text-xs text-slate-500">
                  After making your deposit, fill in the form below to register your
                  participation.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="ps-name"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Name
                    </label>
                    <input
                      id="ps-name"
                      name="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Your full name"
                      className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ps-email"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Email
                    </label>
                    <input
                      id="ps-email"
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ps-amount"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Shares Purchase Amount ($)
                    </label>
                    <input
                      id="ps-amount"
                      name="amount"
                      type="number"
                      required
                      min="100"
                      step="0.01"
                      value={form.amount}
                      onChange={handleChange}
                      placeholder="100"
                      className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ps-tx"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Transaction Hash
                    </label>
                    <input
                      id="ps-tx"
                      name="txHash"
                      type="text"
                      required
                      value={form.txHash}
                      onChange={handleChange}
                      placeholder="0x..."
                      className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        Submit
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </Reveal>
        ) : (
          <Reveal delay={280}>
            <Card className="mx-auto mt-8 max-w-2xl border-green-200 bg-green-50/60 shadow-sm">
              <CardContent className="py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-6 w-6 text-green-700" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-green-800">
                  Submission Received
                </h3>
                <p className="mt-2 text-sm text-green-700">
                  Thank you! We&apos;ll review your transaction and confirm your
                  participation shortly.
                </p>
              </CardContent>
            </Card>
          </Reveal>
        )}
      </div>
    </section>
  );
}
