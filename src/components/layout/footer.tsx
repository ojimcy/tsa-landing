import { site } from "@/data/content";
import logo from "@/assets/logo.png";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-surface-dark text-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <a
              href={site.socialXUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5"
              aria-label={`${site.name} on X`}
            >
              <img src={logo} alt="" className="h-9 w-9 rounded-md object-cover" />
              <span className="text-lg font-semibold tracking-tight text-white">
                {site.name}
              </span>
            </a>
            <p className="mt-4 text-sm text-slate-400">{site.tagline}.</p>
          </div>

          <FooterColumn
            title="Product"
            links={[
              { label: "Features", href: "#features" },
              { label: "How it works", href: "#how-it-works" },
              { label: "Shares", href: site.sharesAnchor },
              { label: "Admin Portal", href: site.adminUrl },
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
            links={[
              { label: `X — ${site.socialX}`, href: site.socialXUrl, external: true },
              ...site.attribution.map((a) => ({
                label: `X — ${a.label}`,
                href: a.href,
                external: true,
              })),
            ]}
          />
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p className="flex flex-wrap items-center gap-x-1.5">
            {site.attribution.map((a, i) => (
              <span key={a.label} className="flex items-center gap-x-1.5">
                <a
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-brand-soft"
                >
                  {a.label}
                </a>
                {i < site.attribution.length - 1 && <span>·</span>}
              </span>
            ))}
            <span>·</span>
            <span>&copy; {year} {site.name}</span>
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
  links: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => {
          const isExternal =
            link.external ?? /^https?:\/\//.test(link.href);
          return (
            <li key={link.label}>
              <a
                href={link.href}
                {...(isExternal && {
                  target: "_blank",
                  rel: "noopener noreferrer",
                })}
                className="text-sm text-slate-300 transition-colors hover:text-brand-soft"
              >
                {link.label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
