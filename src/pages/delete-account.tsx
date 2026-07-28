import { useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Reveal } from "@/components/reveal";
import { site } from "@/data/content";

// Account deletion instructions. Submitted to Apple (guideline 5.1.1(v)) and
// Google Play (Data safety → account deletion URL), so:
//
//   - the path /delete-account must stay stable once it is on a store listing
//   - the page must be reachable without signing in, and without the app
//   - what it describes must match what the app actually does
//
// The steps, the 30-day window and the blockers below mirror
// tsa-api-go/internal/handlers/account_deletion_handler.go and
// models.AccountDeletionGraceDays. If that behaviour changes, change this too.

const GRACE_DAYS = 30;

/** The in-app path, as a reader would follow it. */
const STEPS = [
  {
    label: "In the app",
    body: "Open Settings, scroll to Danger Zone, and tap Delete Account.",
  },
  {
    label: "Confirm it's you",
    body: "Enter your password. You can tell us why you're leaving — that part is optional and never blocks the deletion.",
  },
  {
    label: "Your account closes",
    body: "Straight away. You're signed out on every device, and your profile, ads and listings stop being visible to anyone else.",
  },
];

/** What we erase, what we keep, and for how long. */
const RETENTION = [
  {
    when: "Immediately",
    what: "Your account is closed and signed out. Your profile, adverts and listings are withdrawn from the marketplace.",
  },
  {
    when: `For ${GRACE_DAYS} days`,
    what: `We hold a limited record so support can put things back if you change your mind. Email us before the ${GRACE_DAYS} days are up and we can restore the account.`,
  },
  {
    when: `After ${GRACE_DAYS} days`,
    what: "Your personal data is permanently erased. Restoring the account is no longer possible.",
  },
  {
    when: "Kept longer",
    what: "Identity-verification records and completed transaction history, where financial regulations require us to retain them. These are kept apart from your profile and are not used to contact you.",
  },
];

export default function DeleteAccountPage() {
  useEffect(() => {
    const previous = window.document.title;
    window.document.title = `Delete your account · ${site.name}`;
    return () => {
      window.document.title = previous;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-white via-amber-50/40 to-white">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <Reveal>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Delete your account
              </h1>
            </Reveal>
            <Reveal delay={80}>
              <p className="mt-6 text-base leading-relaxed text-slate-600">
                You can close your {site.name} account from inside the app, at any time, without
                asking us first. It takes effect immediately. This page explains what happens
                next — and what it does not touch.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="bg-white pb-20">
          <div className="mx-auto max-w-3xl space-y-16 px-4 sm:px-6 lg:px-8">
            {/* Steps are numbered because this genuinely is a sequence the
                reader follows in order, not decoration. */}
            <Reveal>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  How to delete it
                </h2>
                <ol className="mt-8 space-y-8">
                  {STEPS.map((step, i) => (
                    <li key={step.label} className="flex gap-5">
                      <span
                        aria-hidden
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-sm font-semibold text-amber-700"
                      >
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{step.label}</h3>
                        <p className="mt-1 text-base leading-relaxed text-slate-600">
                          {step.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>

            {/* The one thing most people worry about, answered before they ask.
                Given prominence because it is specific to a non-custodial
                wallet and contradicts what "delete my account" implies
                everywhere else. */}
            <Reveal>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 sm:p-8">
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                  Deleting your account does not touch your crypto
                </h2>
                <p className="mt-3 text-base leading-relaxed text-slate-700">
                  Your wallet is non-custodial: we never held your funds, and closing your account
                  does not move, freeze or erase them. Your recovery phrase still controls the
                  wallet, and you can restore it in any compatible app.
                </p>
                <p className="mt-3 text-base leading-relaxed text-slate-700">
                  That cuts both ways. We cannot recover a recovery phrase we never had. If you
                  want your funds somewhere else, move them{" "}
                  <strong className="font-semibold">before</strong> you delete the account, while
                  you still have the app in front of you.
                </p>
              </div>
            </Reveal>

            <Reveal>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Finish these first
                </h2>
                <p className="mt-3 text-base leading-relaxed text-slate-600">
                  Deletion is blocked while you have obligations to someone else in flight,
                  because walking away would leave their money or goods stranded:
                </p>
                <ul className="mt-5 space-y-3 text-base leading-relaxed text-slate-600">
                  <li className="flex gap-3">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    <span>
                      <strong className="font-semibold text-slate-900">Live P2P trades</strong> —
                      anything awaiting payment, marked paid, releasing or in dispute. Complete or
                      cancel them.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    <span>
                      <strong className="font-semibold text-slate-900">Open marketplace orders</strong>{" "}
                      — as buyer or seller, until they're delivered or cancelled.
                    </span>
                  </li>
                </ul>
                <p className="mt-5 text-base leading-relaxed text-slate-600">
                  The app tells you which ones are in the way when you try. A wallet balance on its
                  own never blocks deletion.
                </p>
              </div>
            </Reveal>

            <Reveal>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  What happens to your data
                </h2>
                <dl className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
                  {RETENTION.map((row) => (
                    <div key={row.when} className="grid gap-2 py-5 sm:grid-cols-[10rem_1fr] sm:gap-6">
                      <dt className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                        {row.when}
                      </dt>
                      <dd className="text-base leading-relaxed text-slate-600">{row.what}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-5 text-sm leading-relaxed text-slate-500">
                  Our{" "}
                  <a
                    href="/privacy"
                    className="font-medium text-amber-700 underline underline-offset-4 hover:text-amber-800"
                  >
                    Privacy Policy
                  </a>{" "}
                  sets out these retention periods in full.
                </p>
              </div>
            </Reveal>

            <Reveal>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  If you no longer have the app
                </h2>
                <p className="mt-3 text-base leading-relaxed text-slate-600">
                  Email{" "}
                  <a
                    href={`mailto:${site.supportEmail}?subject=Delete%20my%20account`}
                    className="font-medium text-amber-700 underline underline-offset-4 hover:text-amber-800"
                  >
                    {site.supportEmail}
                  </a>{" "}
                  from the address on your account and ask us to delete it. We'll confirm it's you
                  before we do anything, then close the account and write back to confirm. The same
                  timeline above applies from the day we close it.
                </p>
                <p className="mt-3 text-base leading-relaxed text-slate-600">
                  Changed your mind? Email the same address within {GRACE_DAYS} days and we can
                  restore the account.
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
