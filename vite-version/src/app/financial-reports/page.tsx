import * as React from "react";
import { FileBarChart, RefreshCw } from "lucide-react";
import { BaseLayout } from "@/components/layouts/base-layout";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { api } from "@/lib/api-client";
import { formatKES } from "@/lib/format";

type TrialBalanceAccount={id:string;code:string;name:string;account_type:string;total_debits:number;total_credits:number;debit_balance:number;credit_balance:number};
type TrialBalance={fromDate:string|null;toDate:string|null;accounts:TrialBalanceAccount[];totalDebits:number;totalCredits:number;variance:number;balanced:boolean};
const message=(e:unknown)=>e&&typeof e==="object"&&"message" in e?String((e as {message:unknown}).message):"The request failed. Please try again.";

export default function FinancialReportsPage(){
 const [fromDate,setFromDate]=React.useState("");const [toDate,setToDate]=React.useState("");
 const [report,setReport]=React.useState<TrialBalance|null>(null);const [loading,setLoading]=React.useState(true);const [error,setError]=React.useState<string|null>(null);
 const load=React.useCallback(async()=>{setLoading(true);setError(null);try{const q=new URLSearchParams();if(fromDate)q.set("fromDate",fromDate);if(toDate)q.set("toDate",toDate);setReport(await api.get<TrialBalance>("/accounting/reports/trial-balance"+(q.size?"?"+q.toString():"")));}catch(e){setError(message(e));}finally{setLoading(false);}},[fromDate,toDate]);
 React.useEffect(()=>{void load();},[load]);
 return <BaseLayout><div className="flex flex-col gap-6 px-4 lg:px-6">
  <PageHeader title="Financial Reports" description="Review posted-ledger balances. Trial balance is live; additional statements will be enabled as their controls are completed."/>
  <Card><CardContent className="flex flex-wrap items-end gap-3 p-4">
   <div className="grid gap-2"><label className="text-sm font-medium">From date</label><Input type="date" value={fromDate} max={toDate||undefined} onChange={e=>setFromDate(e.target.value)}/></div>
   <div className="grid gap-2"><label className="text-sm font-medium">To date</label><Input type="date" value={toDate} min={fromDate||undefined} onChange={e=>setToDate(e.target.value)}/></div>
   <Button variant="outline" onClick={()=>void load()} disabled={loading}><RefreshCw className="mr-2 size-4"/>Refresh report</Button>
  </CardContent></Card>
  <Card><CardContent className="p-0">
   <div className="flex flex-wrap items-center justify-between gap-2 p-4"><h2 className="font-semibold">Trial balance</h2>{report&&<span className={report.balanced?"text-sm text-emerald-600":"text-sm text-destructive"}>{report.balanced?"Debits and credits balance":"Out of balance: "+formatKES(Math.abs(report.variance))}</span>}</div>
   {loading?<div className="flex justify-center p-12"><LoadingSpinner/></div>:error?<div className="p-6 text-sm text-destructive" role="alert">{error}<Button className="ml-3" variant="outline" size="sm" onClick={()=>void load()}>Retry</Button></div>:!report||report.accounts.length===0?<EmptyState icon={FileBarChart} title="No accounts to report" description="The report will show posted account balances when the company has a chart of accounts and ledger activity."/>:
   <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-y bg-muted/40 text-left"><th className="p-3">Code</th><th className="p-3">Account</th><th className="p-3">Type</th><th className="p-3 text-right">Debit balance</th><th className="p-3 text-right">Credit balance</th></tr></thead><tbody>{report.accounts.map(a=><tr key={a.id} className="border-b last:border-0"><td className="p-3 tabular-nums">{a.code}</td><td className="p-3 font-medium">{a.name}</td><td className="p-3 capitalize">{a.account_type}</td><td className="p-3 text-right tabular-nums">{formatKES(a.debit_balance)}</td><td className="p-3 text-right tabular-nums">{formatKES(a.credit_balance)}</td></tr>)}</tbody><tfoot><tr className="bg-muted/40 font-semibold"><td className="p-3" colSpan={3}>Totals</td><td className="p-3 text-right tabular-nums">{formatKES(report.totalDebits)}</td><td className="p-3 text-right tabular-nums">{formatKES(report.totalCredits)}</td></tr></tfoot></table></div>}
  </CardContent></Card>
 </div></BaseLayout>;
}
