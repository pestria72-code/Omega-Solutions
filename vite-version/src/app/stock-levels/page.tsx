import { Boxes } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export default function StockLevelsPage() {
  return (
    <ModulePlaceholder
      title="Stock Levels"
      description="Current inventory levels across all warehouses"
      icon={Boxes}
      tableHeaders={["Product", "SKU", "Warehouse", "Quantity", "Status"]}
      tableRows={[
        ["LED Tube Light 4ft", "ELEC-001", "Nairobi HQ", "340 pcs", "In Stock"],
        ["Solar Panel 100W", "ELEC-002", "Nairobi HQ", "45 pcs", "Low Stock"],
        ["A4 Paper Ream 80gsm", "STAT-001", "Mombasa Branch", "1,200 reams", "In Stock"],
        ["Detergent 5L", "CLN-001", "Nairobi HQ", "0 bottles", "Out of Stock"],
        ["Office Chair Ergonomic", "FUR-001", "Nairobi HQ", "28 pcs", "In Stock"],
      ]}
    />
  )
}
