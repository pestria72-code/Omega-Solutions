import { Logo } from "@/components/logo"
import { Separator } from "@/components/ui/separator"
import { getAppUrl } from "@/lib/utils"

const links = [
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
]

export function LandingFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <a href="/" className="flex items-center gap-3">
            <Logo size={32} />
            <span className="font-semibold">Omega Solutions</span>
          </a>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
            {links.map((link) => (
              <a key={link.label} href={link.href} className="transition-colors hover:text-foreground">
                {link.label}
              </a>
            ))}
            <a href={getAppUrl("/login")} className="font-medium text-primary hover:underline">
              Sign in
            </a>
            <a href="https://github.com/pestria72-code/Omega-Solutions" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">
              Source repository
            </a>
          </nav>
        </div>
        <Separator className="my-6" />
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Omega Solutions. Business operations, connected.
        </p>
      </div>
    </footer>
  )
}
