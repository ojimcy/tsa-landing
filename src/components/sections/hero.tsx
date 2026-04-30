import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { hero } from "@/data/content";
import heroPhone from "@/assets/screenshots/mockup-home.svg";

export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-gradient-to-b from-white via-amber-50/40 to-white"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
        <div>
          <Reveal>
            <span className="inline-flex items-center rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-medium text-brand">
              {hero.eyebrow}
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              {hero.headline}
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              {hero.subheadline}
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <a href={hero.primaryCta.href}>
                  {hero.primaryCta.label}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href={hero.secondaryCta.href}>{hero.secondaryCta.label}</a>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <p className="mt-6 text-xs text-slate-500">
              Available soon on App Store, Google Play, and Amazon Appstore.
            </p>
          </Reveal>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <div className="absolute inset-0 -z-10 mx-auto h-72 w-72 animate-soft-pulse rounded-full bg-brand-soft/30 blur-3xl sm:h-96 sm:w-96" />
          <Reveal delay={200}>
            <div className="animate-float">
              <PhoneFrame src={heroPhone} alt="TSA Connect app on a phone" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function PhoneFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative h-[520px] w-[260px] rounded-[2.5rem] border-[10px] border-slate-900 bg-slate-900 shadow-2xl sm:h-[600px] sm:w-[300px]">
      <div className="absolute inset-x-1/2 top-1.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-slate-900" />
      <img
        src={src}
        alt={alt}
        className="h-full w-full rounded-[1.7rem] object-cover"
      />
    </div>
  );
}
