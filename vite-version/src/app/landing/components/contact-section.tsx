import { ArrowRight, Mail, ShieldCheck, Workflow } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAppUrl } from "@/lib/utils"

export function ContactSection() {
  return (
    <section id="contact" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">
            Get started
          </p>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to bring your business together?
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Explore the Omega Solutions ERP workspace for connected finance, inventory, workforce, payroll, sales, and administration workflows.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" nativeButton={false} render={<a href={getAppUrl("/login")} />}>
              Sign in or register
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button size="lg" variant="outline" nativeButton={false} render={<a href="#features" />}>
              Explore capabilities
            </Button>
          </div>
        </div>
        <div className="mx-auto mt-14 grid max-w-4xl gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Workflow className="size-5 text-primary" />
                Connected operations
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Keep key business processes accessible in one workspace.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-5 text-primary" />
                Controlled access
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Use the ERP's authenticated workspace and configured permissions.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="size-5 text-primary" />
                Need assistance?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Sign in to access your workspace or use the project repository to report an issue.
              <a className="mt-2 inline-block font-medium text-primary hover:underline" href="https://github.com/pestria72-code/Omega-Solutions/issues" target="_blank" rel="noopener noreferrer">Contact project maintainers</a>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
