import { Reveal } from "@/components/reveal";
import { steps } from "@/data/content";

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-gradient-to-b from-slate-50 to-white py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              How it works
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Get up and running in minutes — install the app, verify, fund, and you're in.
            </p>
          </Reveal>
        </div>

        <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, idx) => (
            <Reveal
              key={step.title}
              as="li"
              delay={idx * 110}
              className="flex h-full flex-col items-center text-center"
            >
              <div className="relative">
                <div className="absolute -inset-4 -z-10 rounded-3xl bg-brand-soft/20 blur-2xl" />
                <div className="h-64 w-36 overflow-hidden rounded-2xl border-4 border-slate-900 bg-slate-900 shadow-lg sm:h-72 sm:w-40">
                  <img
                    src={step.screenshot}
                    alt={`Screenshot for step ${idx + 1}: ${step.title}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <div className="mt-6 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                {idx + 1}
              </div>
              <h3 className="mt-3 text-base font-semibold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-2 max-w-[14rem] text-sm leading-relaxed text-slate-600">
                {step.description}
              </p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
