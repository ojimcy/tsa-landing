import { useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Reveal } from "@/components/reveal";
import type { LegalDocument } from "@/data/legal";

// Shared renderer for the Privacy Policy and Terms of Service pages. Both are
// linked from the app stores and from inside the app, so the text comes from
// the same structured source the app bundles (src/data/legal).

export function LegalPage({ document: doc }: { document: LegalDocument }) {
  // These URLs are submitted to the app stores, so the tab title should name
  // the document rather than leaving the generic site title.
  useEffect(() => {
    const previous = window.document.title;
    window.document.title = `${doc.title} · TSA Connect`;
    return () => {
      window.document.title = previous;
    };
  }, [doc.title]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-white via-amber-50/40 to-white">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <Reveal>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                {doc.title}
              </h1>
            </Reveal>
            <Reveal delay={80}>
              <p className="mt-4 text-sm text-slate-500">
                Version {doc.version} · Effective {doc.effectiveDate}
              </p>
            </Reveal>
            <Reveal delay={160}>
              <div className="mt-6 space-y-4">
                {doc.intro.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 24)}
                    className="text-base leading-relaxed text-slate-600"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="bg-white pb-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            {/* Table of contents — these documents are long enough that a
                reader arriving from a store listing needs a way to jump. */}
            <nav className="mb-12 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Contents
              </h2>
              <ol className="mt-3 space-y-1.5">
                {doc.sections.map((section) => (
                  <li key={section.heading}>
                    <a
                      href={`#${slugify(section.heading)}`}
                      className="text-sm text-slate-600 underline-offset-2 transition-colors hover:text-brand hover:underline"
                    >
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="space-y-10">
              {doc.sections.map((section) => (
                <section
                  key={section.heading}
                  id={slugify(section.heading)}
                  className="scroll-mt-24"
                >
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                    {section.heading}
                  </h2>

                  {section.body?.map((paragraph) => (
                    <p
                      key={paragraph.slice(0, 24)}
                      className="mt-3 text-base leading-relaxed text-slate-600"
                    >
                      {paragraph}
                    </p>
                  ))}

                  {section.bullets && (
                    <ul className="mt-3 space-y-2">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet.slice(0, 24)}
                          className="flex gap-3 text-base leading-relaxed text-slate-600"
                        >
                          <span aria-hidden className="mt-1 text-brand">
                            •
                          </span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.footnote?.map((paragraph) => (
                    <p
                      key={paragraph.slice(0, 24)}
                      className="mt-3 text-base leading-relaxed text-slate-600"
                    >
                      {paragraph}
                    </p>
                  ))}
                </section>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function slugify(heading: string) {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
