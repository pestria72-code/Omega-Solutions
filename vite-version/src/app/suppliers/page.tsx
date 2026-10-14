import { Briefcase } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export default function SuppliersPage() {
  return (
    <ModulePlaceholder
      title="Suppliers"
      description="Manage supplier accounts and contact information"
      icon={Briefcase}
      tableHeaders={["Supplier Name", "Contact", "City", "Balance Due", "Status"]}
      tableRows={[
        ["Nairobi Electronics Ltd", "info@nel.co.ke", "Nairobi", "KSh 125,000", "Active"],
        ["Mombasa Supply Co", "sales@msc.co.ke", "Mombasa", "KSh 0", "Active"],
        ["Stationery World Ltd", "orders@swl.co.ke", "Nairobi", "KSh 45,000", "Active"],
        ["CleanPro Distributors", "info@cleanpro.co.ke", "Nakuru", "KSh 18,000", "Active"],
        ["Furniture Masters", "contact@fm.co.ke", "Nairobi", "KSh 0", "Inactive"],
      ]}
    />
  )
}
