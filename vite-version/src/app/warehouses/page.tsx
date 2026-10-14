import { Building } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export default function WarehousesPage() {
  return (
    <ModulePlaceholder
      title="Warehouses"
      description="Manage warehouse locations and capacities"
      icon={Building}
      tableHeaders={["Warehouse", "Code", "Branch", "Capacity", "Utilization"]}
      tableRows={[
        ["Nairobi Main Store", "NBO-WS-01", "Nairobi HQ", "5,000 sq ft", "72%"],
        ["Mombasa Store", "MSA-WS-01", "Mombasa Branch", "3,000 sq ft", "55%"],
        ["Kisumu Store", "KSM-WS-01", "Kisumu Branch", "2,000 sq ft", "0%"],
      ]}
    />
  )
}
