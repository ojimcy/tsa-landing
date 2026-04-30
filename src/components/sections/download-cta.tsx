import { Reveal } from "@/components/reveal";
import { storeBadges } from "@/data/content";

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
            The app is launching soon. Look out for it on the App Store, Google Play,
            and Amazon Appstore.
          </p>
        </Reveal>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {storeBadges.map((badge, idx) => (
            <Reveal key={badge.store} delay={160 + idx * 90}>
              <StoreBadge caption={badge.caption} store={badge.store} />
            </Reveal>
          ))}
        </div>

        <Reveal delay={500}>
          <p className="mt-8 text-xs uppercase tracking-wider text-brand-soft">
            Coming soon
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function StoreBadge({ caption, store }: { caption: string; store: string }) {
  return (
    <div
      role="img"
      aria-label={`${caption} ${store} — coming soon`}
      className="relative flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-left opacity-80"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white">
        <span className="text-xs font-bold">{store.slice(0, 2).toUpperCase()}</span>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-400">
          {caption}
        </p>
        <p className="text-sm font-semibold text-white">{store}</p>
      </div>
      <span className="absolute -top-2 right-3 animate-soft-pulse rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
        Soon
      </span>
    </div>
  );
}
