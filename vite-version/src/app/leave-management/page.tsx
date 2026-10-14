import { CalendarDays } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export default function LeaveManagementPage() {
  return (
    <ModulePlaceholder
      title="Leave Management"
      description="Track employee leave requests and balances"
      icon={CalendarDays}
      tableHeaders={["Employee", "Leave Type", "Start Date", "End Date", "Status"]}
      tableRows={[
        ["David Otieno", "Annual Leave", "01 Oct 2024", "14 Oct 2024", "Approved"],
        ["Grace Wanjiku", "Sick Leave", "03 Oct 2024", "04 Oct 2024", "Approved"],
        ["Peter Kamau", "Annual Leave", "20 Oct 2024", "27 Oct 2024", "Pending"],
        ["Mary Atieno", "Personal Leave", "15 Oct 2024", "15 Oct 2024", "Pending"],
        ["Aisha Hassan", "Annual Leave", "01 Nov 2024", "07 Nov 2024", "Approved"],
      ]}
    />
  )
}
