import { useEffect, type ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Reveal } from "@/components/reveal";
import { site } from "@/data/content";

const CREATE_PAYMENT_CURL = `curl -X POST https://tsa.mcgpchain.com/api/pay/v1/payments \\
  -H "Authorization: Bearer tsapk_test_…" \\
  -d '{"amount":5000000,"currency":"NGN","reference":"ORDER-123","returnUrl":"https://yourstore.ng/done"}'`;

const VERIFY_WEBHOOK_NODE = `const crypto = require("crypto");

function verifyWebhook(rawBody, header, whsec) {
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.trim().split("=")),
  );
  const t = Number(parts.t);
  // Reject a missing/garbled timestamp, and one too old OR too far in the future.
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > 300) {
    throw new Error("stale");
  }

  const expected = Buffer.from(
    crypto.createHmac("sha256", whsec).update(\`\${parts.t}.\${rawBody}\`).digest("hex"),
  );
  const received = Buffer.from(parts.v1 ?? "");
  // timingSafeEqual throws on unequal lengths, so compare lengths first.
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    throw new Error("bad signature");
  }
}`;

export default function DevelopersTsaPayPage() {
  useEffect(() => {
    const previous = window.document.title;
    window.document.title = `TSA Pay for developers · ${site.name}`;
    return () => {
      window.document.title = previous;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-white via-amber-50/40 to-white">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
            <Reveal>
              <span className="inline-flex items-center rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-medium text-brand">
                TSA Pay
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Accept payments with TSA Pay
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 text-lg leading-relaxed text-slate-600">
                A hosted checkout for TSA Connect. Create a payment from your server, redirect
                the customer, and get a webhook when it's done.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-3xl space-y-14 px-4 sm:px-6 lg:px-8">
            <DocSection title="Get keys" delay={0}>
              <p>
                Apply for TSA Pay in the app. Once an admin approves your merchant account,
                your keys are shown once — copy them somewhere safe.
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Live</strong> and <strong>test</strong> keys are separate; each only
                  reads and writes payments created in its own mode.
                </li>
                <li>
                  Live and test payments each have their own webhook URL and signing secret.
                  There's no merchant self-serve dashboard yet — give us both URLs when you
                  apply, and we configure them for you.
                </li>
              </ul>
            </DocSection>

            <DocSection title="Create a payment" delay={40}>
              <p>
                From your server, create a payment with your secret key. Amounts are integer{" "}
                <strong>kobo</strong> (₦1 = 100 kobo), and currency is always{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">NGN</code>.
              </p>
              <CodeBlock language="bash">{CREATE_PAYMENT_CURL}</CodeBlock>
              <p className="mt-3 text-sm text-slate-500">
                The customer-fee share your admin set decides who pays the platform fee. At the
                default share, a customer paying for a ₦50,000 order pays{" "}
                <strong>₦50,505.06</strong> and you receive <strong>₦50,000</strong>.
              </p>
              <p className="mt-3 text-sm text-slate-500">
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">returnUrl</code> must
                be <strong>https</strong> and on a domain you registered with us when you applied
                — anything else gets a <strong>422</strong>. Give us every domain you'll redirect
                from up front, or ask us to add one later.
              </p>
            </DocSection>

            <DocSection title="Redirect the customer" delay={80}>
              <p>The response includes a checkout link for each surface:</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                <li>
                  On <strong>mobile</strong>, send the customer to <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">appUrl</code> —
                  it opens TSA Connect directly.
                </li>
                <li>
                  On <strong>desktop</strong>, send them to{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">checkoutUrl</code> — a
                  hosted page that shows a QR code to scan with the app.
                </li>
              </ul>
            </DocSection>

            <DocSection title="Verify webhooks" delay={120}>
              <p>
                Every webhook carries an{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">X-TSA-Signature</code>{" "}
                header shaped <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">t=…,v1=…</code>.{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">v1</code> is an
                HMAC-SHA256 of <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">{"<t>.<raw body>"}</code>{" "}
                keyed with your <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">whsec_…</code> secret
                for that event's mode.
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                <li>Reject any <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">t</code> that is missing, or more than 5 minutes away from your clock (old or in the future).</li>
                <li>
                  Check <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">livemode</code> — it's a
                  top-level field on the event (<code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">{"{id, type, livemode, created, data}"}</code>),
                  not inside <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">data</code> — matches the
                  environment you're running in.
                </li>
                <li>
                  Match <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">data.reference</code> and{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">data.amount</code> against your own
                  order before acting on it.
                </li>
                <li>
                  Dedupe on <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">id</code> — we retry
                  webhooks that aren't acknowledged.
                </li>
                <li>Answer with a 2xx quickly; do the slow work after you've responded.</li>
              </ul>
              <CodeBlock language="js">{VERIFY_WEBHOOK_NODE}</CodeBlock>
            </DocSection>

            <DocSection title="Check status" delay={160}>
              <p>
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">GET /api/pay/v1/payments/:id</code>,
                authenticated with the key of that payment's own mode, is the source of truth.
                Never trust the return URL alone — always confirm status server-side.
              </p>
            </DocSection>

            <DocSection title="Cancel" delay={200}>
              <p>
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">POST /api/pay/v1/payments/:id/cancel</code>{" "}
                cancels a payment while it's still <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">pending</code>.
              </p>
            </DocSection>

            <DocSection title="Events and retries" delay={240}>
              <p>Only three events are ever sent:</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                <li><code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">payment.succeeded</code></li>
                <li><code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">payment.failed</code></li>
                <li><code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">payment.expired</code></li>
              </ul>
              <p className="mt-3">
                Nothing fires when a payment moves to <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">processing</code> or
                on any other intermediate state — poll{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">GET /api/pay/v1/payments/:id</code> if
                you need to show that.
              </p>
              <p className="mt-3">
                A delivery that isn't acknowledged with a 2xx is retried at{" "}
                <strong>1m, 5m, 30m, 2h, 6h, then 24h</strong> after the original attempt. If the
                24h retry also fails, the delivery is marked failed and our support can resend it
                from the admin console — dedupe on the event id rather than assuming
                exactly-once delivery.
              </p>
            </DocSection>

            <DocSection title="Test mode" delay={280}>
              <p>
                Test keys and test payments work the same way as live ones, but settle nothing —
                use them to build and test your integration end-to-end before going live.
              </p>
            </DocSection>

            <DocSection title="Late success" delay={320}>
              <p>
                A payment already in progress when its link expires can still succeed — a
                customer may have already sent funds. Design your order flow to accept a late
                success, or refund it; don't assume an expired payment never completed.
              </p>
            </DocSection>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function DocSection({
  title,
  delay,
  children,
}: {
  title: string;
  delay: number;
  children: ReactNode;
}) {
  return (
    <Reveal delay={delay}>
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
        <div className="mt-3 text-base leading-relaxed text-slate-600">{children}</div>
      </div>
    </Reveal>
  );
}

function CodeBlock({ children }: { language: "bash" | "js"; children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-lg bg-surface-dark p-4 text-xs leading-relaxed text-slate-100">
      <code>{children}</code>
    </pre>
  );
}
