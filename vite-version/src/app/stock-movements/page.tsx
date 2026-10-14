import { ArrowLeftRight } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export default function StockMovementsPage() {
  return (
    <ModulePlaceholder
      title="Stock Movements"
      description="Track all stock in and out transactions"
      icon={ArrowLeftRight}
      tableHeaders={["Date", "Product", "Type", "Quantity", "Reference"]}
      tableRows={[
        ["06 Oct 2024", "Solar Panel 100W", "Stock In", "20 pcs", "PO-2024-028"],
        ["05 Oct 2024", "LED Tube Light 4ft", "Stock Out", "50 pcs", "SO-2024-045"],
        ["04 Oct 2024", "Detergent 5L", "Stock Out", "60 bottles", "SO-2024-044"],
        ["03 Oct 2024", "A4 Paper Ream 80gsm", "Transfer", "200 reams", "TRF-001"],
        ["02 Oct 2024", "Office Chair Ergonomic", "Stock Out", "5 pcs", "SO-2024-043"],
      ]}
    />
  )
}
