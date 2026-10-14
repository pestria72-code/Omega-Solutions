import { ShoppingCart } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export default function SalesOrdersPage() {
  return (
    <ModulePlaceholder
      title="Sales Orders"
      description="Track customer orders from confirmation to fulfillment"
      icon={ShoppingCart}
      tableHeaders={["Order #", "Customer", "Date", "Status", "Total"]}
      tableRows={[
        ["SO-2024-045", "Blue Sky Logistics", "01 Oct 2024", "Fulfilled", "KSh 145,000"],
        ["SO-2024-044", "Coastal Imports Ltd", "30 Sep 2024", "Processing", "KSh 320,000"],
        ["SO-2024-043", "Highland Traders", "28 Sep 2024", "Fulfilled", "KSh 87,000"],
        ["SO-2024-042", "Nuru Wholesale", "27 Sep 2024", "Pending", "KSh 43,000"],
        ["SO-2024-041", "Bahari Distributors", "25 Sep 2024", "Processing", "KSh 178,000"],
      ]}
    />
  )
}
