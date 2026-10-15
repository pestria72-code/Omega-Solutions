"use client"

import { CircleHelp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"

type FaqItem = {
  value: string
  question: string
  answer: string
}

const faqItems: FaqItem[] = [
  {
    value: "item-1",
    question: "How do I access Omega Solutions?",
    answer:
      "Use the Sign in or register button to open the existing Omega Solutions authentication page. After successful sign-in, the app takes you to your ERP dashboard.",
  },
  {
    value: "item-2",
    question: "Which business areas does the ERP cover?",
    answer:
      "Omega Solutions includes workflows for finance and accounting, inventory and warehousing, sales and customers, workforce and payroll, purchasing, and administration.",
  },
  {
    value: "item-3",
    question: "How is access to the ERP controlled?",
    answer:
      "ERP pages require authentication, and access to sensitive actions should follow the permissions configured for the signed-in user.",
  },
  {
    value: "item-4",
    question: "Can multiple organizations use the ERP?",
    answer:
      "The project is being developed with tenant-aware access and data separation in mind. Tenant configuration and isolation should be validated for your deployment before onboarding real customer data.",
  },
  {
    value: "item-5",
    question: "Where do I go after signing in?",
    answer:
      "After authentication, the existing application directs you to the ERP dashboard. The landing page remains public, while the dashboard and business modules remain behind the existing protected route.",
  },
  {
    value: "item-6",
    question: "How can I report an issue?",
    answer:
      "Use the Omega Solutions GitHub repository to report bugs or request improvements.",
  },
]

const FaqSection = () => {
  return (
    <section id="faq" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            FAQ
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Answers about accessing the ERP, available business modules, and application access controls.
          </p>
        </div>

        {/* FAQ Content */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-transparent">
            <div className="p-0">
              <Accordion className="gap-5">
                {faqItems.map((item) => (
                  <AccordionItem
                    key={item.value}
                    value={item.value}
                    className="rounded-md border! bg-transparent"
                  >
                    <AccordionTrigger className="cursor-pointer items-center gap-4 rounded-none bg-transparent py-2 ps-3 pe-4 hover:no-underline data-panel-open:border-b">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
                          <CircleHelp className="size-5" />
                        </div>
                        <span className="text-start font-semibold">
                          {item.question}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 bg-transparent">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>

          {/* Contact Support CTA */}
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              Still have questions? We're here to help.
            </p>
            <Button
              className="cursor-pointer"
              nativeButton={false}
              render={<a href="#contact" />}
            >
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

export { FaqSection }
