import { useEffect, type ReactNode } from "react";
import { Loader2, XCircle } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Reveal } from "@/components/reveal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { appStoreUrl, site } from "@/data/content";

/** The page frame shared by the TSA Pay checkout (/pay/:id) and reusable link (/pay/l/:slug) pages. */
export function PayShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    window.document.title = `Pay · ${site.name}`;
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {/* These pages are reached from shared links and QR codes — never send
          the payment id, link slug or query string on to third-party
          resources they embed. */}
      <meta name="referrer" content="no-referrer" />
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-white via-amber-50/40 to-white">
          <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <Reveal>
              <Card className="border-brand/10 shadow-sm">
                <CardContent className="p-8 text-center">{children}</CardContent>
              </Card>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export function TestModeBanner() {
  return (
    <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
      Test payment link — no real money moves.
    </p>
  );
}

/** A dead end (bad or closed link, failed load), with an optional retry. */
export function PayNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <>
      <XCircle className="mx-auto h-10 w-10 text-slate-300" />
      <p className="mt-4 text-base font-medium text-slate-700 wrap-anywhere">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </>
  );
}

export function PayLoading({ label }: { label: string }) {
  return (
    <>
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" />
      <p className="mt-4 text-sm text-slate-500">{label}</p>
    </>
  );
}

/** Store buttons for a payer who doesn't have the app yet (App Store only once it's listed). */
export function GetTheApp() {
  const stores = [
    { name: "Google Play", href: site.playStoreUrl },
    ...(appStoreUrl ? [{ name: "App Store", href: appStoreUrl }] : []),
  ];

  return (
    <div className="mt-6 border-t border-slate-100 pt-5">
      <p className="text-sm text-slate-500">
        Don&apos;t have TSA Connect? Get the app, sign up, then come back to this link.
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {stores.map((store) => (
          <Button key={store.name} asChild variant="outline" size="sm">
            <a href={store.href} target="_blank" rel="noopener noreferrer">
              Get it on {store.name}
            </a>
          </Button>
        ))}
      </div>
    </div>
  );
}
