import { Mail } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Reveal } from "@/components/reveal";
import { about, contactChannels, site } from "@/data/content";

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-white via-amber-50/40 to-white">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8">
            <Reveal>
              <span className="inline-flex items-center rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-medium text-brand">
                About Us
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Connecting businesses, creating opportunities
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 text-lg leading-relaxed text-slate-600">
                {about.intro}
              </p>
            </Reveal>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="space-y-6">
              {about.paragraphs.map((paragraph, idx) => (
                <Reveal key={paragraph.slice(0, 24)} delay={idx * 70}>
                  <p className="text-base leading-relaxed text-slate-600">
                    {paragraph}
                  </p>
                </Reveal>
              ))}
            </div>

            <Reveal delay={about.paragraphs.length * 70}>
              <blockquote className="mt-10 rounded-2xl border border-brand/20 bg-brand/5 p-6 text-lg font-medium leading-relaxed text-slate-900 sm:p-8">
                {about.mission}
              </blockquote>
            </Reveal>

            <Reveal delay={about.paragraphs.length * 70 + 80}>
              <dl className="mt-10 grid gap-6 border-t border-slate-200 pt-8 sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Operated by
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">{about.companyName}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Registration
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">{about.companyRc}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Launch
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">{about.launchDate}</dd>
                </div>
              </dl>
            </Reveal>
          </div>
        </section>

        <section id="contact" className="bg-slate-50 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Contact us
              </h2>
            </Reveal>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {contactChannels.map((channel, idx) => (
                <Reveal key={channel.email} delay={idx * 70} className="h-full">
                  <a
                    href={`mailto:${channel.email}`}
                    className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                      <Mail className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-slate-900">
                      {channel.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {channel.description}
                    </p>
                    <p className="mt-4 text-sm font-medium text-brand">{channel.email}</p>
                  </a>
                </Reveal>
              ))}
            </div>

            <Reveal delay={contactChannels.length * 70}>
              <p className="mt-8 text-sm text-slate-500">
                {site.name} is scheduled for launch in {about.launchDate}.
              </p>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
