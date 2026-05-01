import { Button } from "@/components/ui/button";
import { site } from "@/data/content";
import logo from "@/assets/logo.png";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Private Sale", href: "#private-sale" },
  { label: "Shares", href: site.sharesUrl },
  { label: "Download", href: "#download" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a
          href={site.socialXUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5"
          aria-label={`${site.name} on X`}
        >
          <img src={logo} alt="" className="h-8 w-8 rounded-md object-cover" />
          <span className="text-base font-semibold tracking-tight text-slate-900">
            {site.name}
          </span>
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => {
            const isExternal = /^https?:\/\//.test(link.href);
            return (
              <a
                key={link.href}
                href={link.href}
                {...(isExternal && {
                  target: "_blank",
                  rel: "noopener noreferrer",
                })}
                className="text-sm font-medium text-slate-700 transition-colors hover:text-brand"
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        <Button asChild size="sm">
          <a href="#download">Get notified</a>
        </Button>
      </div>
    </header>
  );
}
