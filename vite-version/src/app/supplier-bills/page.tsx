import { FileText } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export default function SupplierBillsPage() {
  return (
    <ModulePlaceholder
      title="Supplier Bills"
      description="Track bills received from suppliers"
      icon={FileText}
      tableHeaders={["Bill #", "Supplier", "Date", "Due Date", "Amount"]}
      tableRows={[
        ["BILL-2024-022", "Nairobi Electronics Ltd", "03 Oct 2024", "17 Oct 2024", "KSh 280,000"],
        ["BILL-2024-021", "Stationery World Ltd", "01 Oct 2024", "15 Oct 2024", "KSh 95,000"],
        ["BILL-2024-020", "CleanPro Distributors", "28 Sep 2024", "12 Oct 2024", "KSh 42,000"],
        ["BILL-2024-019", "Mombasa Supply Co", "26 Sep 2024", "10 Oct 2024", "KSh 67,000"],
        ["BILL-2024-018", "Nairobi Electronics Ltd", "20 Sep 2024", "04 Oct 2024", "KSh 125,000"],
      ]}
    />
  )
}
