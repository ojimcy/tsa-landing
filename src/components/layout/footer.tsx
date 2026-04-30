import { site } from "@/data/content";
import logo from "@/assets/logo.png";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-surface-dark text-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="" className="h-9 w-9 rounded-md object-cover" />
              <span className="text-lg font-semibold tracking-tight text-white">
                {site.name}
              </span>
            </div>
            <p className="mt-4 text-sm text-slate-400">{site.tagline}.</p>
          </div>

          <FooterColumn
            title="Product"
            links={[
              { label: "Features", href: "#features" },
              { label: "How it works", href: "#how-it-works" },
              { label: "Download", href: "#download" },
            ]}
          />

          <FooterColumn
            title="Support"
            links={[
              {
                label: site.supportEmail,
                href: `mailto:${site.supportEmail}`,
              },
              {
                label: "Partnership & inquiry",
                href: `mailto:${site.supportEmail}?subject=Partnership%20%26%20Inquiry`,
              },
              {
                label: "Report a problem",
                href: `mailto:${site.supportEmail}?subject=Report%20%2F%20Complaint`,
              },
            ]}
          />

          <FooterColumn
            title="Follow"
            links={[{ label: `X — ${site.socialX}`, href: "#" }]}
          />
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>
            {site.attribution.join(" · ")} · &copy; {year} {site.name}
          </p>
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Connect The World
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className="text-sm text-slate-300 transition-colors hover:text-brand-soft"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
