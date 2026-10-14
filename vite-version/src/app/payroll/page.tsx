import { Banknote } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export default function PayrollPage() {
  return (
    <ModulePlaceholder
      title="Payroll"
      description="Process and track employee salary payments"
      icon={Banknote}
      tableHeaders={["Employee", "Position", "Gross Salary", "Deductions", "Net Pay"]}
      tableRows={[
        ["James Mwangi", "Managing Director", "KSh 450,000", "KSh 67,500", "KSh 382,500"],
        ["Aisha Hassan", "Branch Manager", "KSh 280,000", "KSh 42,000", "KSh 238,000"],
        ["Grace Wanjiku", "Finance Manager", "KSh 250,000", "KSh 37,500", "KSh 212,500"],
        ["Peter Kamau", "Sales Officer", "KSh 85,000", "KSh 12,750", "KSh 72,250"],
        ["Mary Atieno", "Warehouse Supervisor", "KSh 95,000", "KSh 14,250", "KSh 80,750"],
      ]}
    />
  )
}
