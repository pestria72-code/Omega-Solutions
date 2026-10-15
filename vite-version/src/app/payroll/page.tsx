import { Banknote } from "lucide-react";
import { BaseLayout } from "@/components/layouts/base-layout";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";

export default function PayrollPage(){
 return <BaseLayout><div className="flex flex-col gap-6 px-4 lg:px-6"><PageHeader title="Payroll" description="Payroll processing is not enabled yet. No sample salaries or deductions are shown."/><Card><CardContent><EmptyState icon={Banknote} title="Payroll is not configured" description="Employee records and leave management are being connected first. Payroll calculations and statutory deductions will be added only with verified Kenyan payroll rules and audit controls."/></CardContent></Card></div></BaseLayout>;
}
