import { UserCircle } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export default function EmployeesPage() {
  return (
    <ModulePlaceholder
      title="Employees"
      description="Manage employee records and information"
      icon={UserCircle}
      tableHeaders={["Name", "Position", "Department", "Branch", "Status"]}
      tableRows={[
        ["James Mwangi", "Managing Director", "Management", "Nairobi HQ", "Active"],
        ["Aisha Hassan", "Branch Manager", "Operations", "Mombasa Branch", "Active"],
        ["David Otieno", "Branch Manager", "Operations", "Kisumu Branch", "On Leave"],
        ["Grace Wanjiku", "Finance Manager", "Finance", "Nairobi HQ", "Active"],
        ["Peter Kamau", "Sales Officer", "Sales", "Nairobi HQ", "Active"],
        ["Mary Atieno", "Warehouse Supervisor", "Inventory", "Mombasa Branch", "Active"],
      ]}
    />
  )
}
