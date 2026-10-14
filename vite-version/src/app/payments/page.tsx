import { Banknote } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export default function PaymentsPage() {
  return (
    <ModulePlaceholder
      title="Payments"
      description="Record and track customer payments"
      icon={Banknote}
      tableHeaders={["Payment #", "Customer", "Date", "Method", "Amount"]}
      tableRows={[
        ["PAY-2024-032", "Highland Traders", "05 Oct 2024", "M-Pesa", "KSh 87,000"],
        ["PAY-2024-031", "Blue Sky Logistics", "04 Oct 2024", "Bank Transfer", "KSh 96,000"],
        ["PAY-2024-030", "Nuru Wholesale", "02 Oct 2024", "Cash", "KSh 43,000"],
        ["PAY-2024-029", "Coastal Imports Ltd", "01 Oct 2024", "Bank Transfer", "KSh 150,000"],
        ["PAY-2024-028", "Bahari Distributors", "28 Sep 2024", "M-Pesa", "KSh 65,000"],
      ]}
    />
  )
}
