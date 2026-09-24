import { Reveal } from "@/components/reveal";
import { storeBadges } from "@/data/content";
import type { StoreBadge as StoreBadgeData } from "@/data/content";

export function DownloadCta() {
  return (
    <section id="download" className="bg-surface-dark py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Get TSA Connect
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-300">
            Download the app on Google Play today. The App Store and Amazon Appstore
            versions are on the way.
          </p>
        </Reveal>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {storeBadges.map((badge, idx) => (
            <Reveal key={badge.store} delay={160 + idx * 90}>
              <StoreBadge {...badge} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function StoreBadge({ caption, store, href }: StoreBadgeData) {
  const body = (
    <>
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white">
        <span className="text-xs font-bold">{store.slice(0, 2).toUpperCase()}</span>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-400">
          {caption}
        </p>
        <p className="text-sm font-semibold text-white">{store}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${caption} ${store}`}
        className="flex items-center gap-3 rounded-xl border border-brand bg-brand/20 px-5 py-3 text-left transition-colors hover:bg-brand/30"
      >
        {body}
      </a>
    );
  }

  return (
    <div
      role="img"
      aria-label={`${caption} ${store} — coming soon`}
      className="relative flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-left opacity-80"
    >
      {body}
      <span className="absolute -top-2 right-3 animate-soft-pulse rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
        Soon
      </span>
    </div>
  );
}
