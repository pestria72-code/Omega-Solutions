import * as React from "react";
import { AlertCircle, BookOpen, Loader2, Plus, RefreshCw, Scale } from "lucide-react";
import { BaseLayout } from "@/components/layouts/base-layout";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api-client";
import { formatKES, formatDate } from "@/lib/format";

type Account={id:string;code:string;name:string;account_type:"asset"|"liability"|"equity"|"income"|"expense";normal_side:"debit"|"credit";system_code:string|null;is_active:boolean;balance:string|number;total_debits:string|number;total_credits:string|number};
type Journal={id:string;entry_number:string;entry_date:string;description:string;source_type:string|null;status:string;total_debits:string|number;total_credits:string|number};
const typeLabel:Record<Account["account_type"],string>={asset:"Asset",liability:"Liability",equity:"Equity",income:"Income",expense:"Expense"};
function errorText(e:unknown){return e&&typeof e==="object"&&"message" in e?String((e as {message:unknown}).message):"Unable to load accounting data. Please try again."}
export default function ChartOfAccountsPage(){
 const [accounts,setAccounts]=React.useState<Account[]>([]);
 const [journals,setJournals]=React.useState<Journal[]>([]);
 const [loading,setLoading]=React.useState(true);
 const [saving,setSaving]=React.useState(false);
 const [showForm,setShowForm]=React.useState(false);
 const [error,setError]=React.useState("");
 const [code,setCode]=React.useState("");
 const [name,setName]=React.useState("");
 const [accountType,setAccountType]=React.useState("expense");
 const [normalSide,setNormalSide]=React.useState("debit");
 const refresh=React.useCallback(async()=>{
  setLoading(true);setError("");
  try{const [a,j]=await Promise.all([api.get<Account[]>("/accounting/accounts"),api.get<Journal[]>("/accounting/journals")]);setAccounts(a);setJournals(j)}
  catch(e){setError(errorText(e))}finally{setLoading(false)}
 },[]);
 React.useEffect(()=>{void refresh()},[refresh]);
 const create=async()=>{
  if(!code.trim()||!name.trim()){setError("Enter an account code and name.");return}
  setSaving(true);setError("");
  try{await api.post("/accounting/accounts",{code:code.trim(),name:name.trim(),accountType,normalSide});setCode("");setName("");setShowForm(false);await refresh()}
  catch(e){setError(errorText(e))}finally{setSaving(false)}
 };
 const totalPayables=accounts.find(a=>a.system_code==="accounts_payable");
 const totalAssets=accounts.filter(a=>a.account_type==="asset").reduce((s,a)=>s+Number(a.balance),0);
 return <BaseLayout><div className="flex flex-col gap-6 px-4 lg:px-6">
  <PageHeader title="Chart of Accounts" description="Company-specific accounts and the posted general ledger. Supplier bills and payments post balanced journal entries automatically." action={<div className="flex gap-2"><Button variant="outline" onClick={()=>void refresh()} disabled={loading}><RefreshCw className="size-4"/>Refresh</Button><Button onClick={()=>setShowForm(v=>!v)}><Plus className="size-4"/>{showForm?"Close form":"New account"}</Button></div>}/>
  {error&&<div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0"/>{error}</div>}
  <div className="grid gap-3 sm:grid-cols-3"><Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Accounts</p><p className="text-2xl font-semibold tabular-nums">{accounts.length}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total asset balances</p><p className="text-2xl font-semibold tabular-nums">{formatKES(totalAssets)}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Accounts payable</p><p className="text-2xl font-semibold tabular-nums">{formatKES(Number(totalPayables?.balance??0))}</p></CardContent></Card></div>
  {showForm&&<Card><CardContent className="grid gap-4 p-4 md:grid-cols-2"><div className="md:col-span-2"><h2 className="font-semibold">Add account</h2><p className="text-sm text-muted-foreground">System-mapped accounts are created automatically and cannot be duplicated by code.</p></div><div className="flex flex-col gap-1"><Label htmlFor="account-code">Account code</Label><Input id="account-code" value={code} onChange={e=>setCode(e.target.value)} maxLength={20} placeholder="e.g. 5200"/></div><div className="flex flex-col gap-1"><Label htmlFor="account-name">Account name</Label><Input id="account-name" value={name} onChange={e=>setName(e.target.value)} maxLength={160} placeholder="e.g. Transport expense"/></div><div className="flex flex-col gap-1"><Label htmlFor="account-type">Type</Label><select id="account-type" className="h-9 rounded-md border bg-background px-3 text-sm" value={accountType} onChange={e=>{setAccountType(e.target.value);setNormalSide(["liability","equity","income"].includes(e.target.value)?"credit":"debit")}}>{[["asset","Asset"],["liability","Liability"],["equity","Equity"],["income","Income"],["expense","Expense"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div><div className="flex flex-col gap-1"><Label htmlFor="normal-side">Normal balance</Label><select id="normal-side" className="h-9 rounded-md border bg-background px-3 text-sm" value={normalSide} onChange={e=>setNormalSide(e.target.value)}><option value="debit">Debit</option><option value="credit">Credit</option></select></div><div className="flex justify-end md:col-span-2"><Button onClick={()=>void create()} disabled={saving}>{saving?<Loader2 className="size-4 animate-spin"/>:<Plus className="size-4"/>}Save account</Button></div></CardContent></Card>}
  <Card><CardContent className="flex flex-col gap-4 p-4"><div className="flex items-center gap-2"><BookOpen className="size-5 text-muted-foreground"/><div><h2 className="font-semibold">Accounts register</h2><p className="text-sm text-muted-foreground">Balances are calculated from posted journal entries. No demo balances are displayed.</p></div></div>
  {loading?<div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground"/></div>:accounts.length===0?<p className="py-10 text-center text-sm text-muted-foreground">No accounts returned for this company.</p>:<div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Account name</TableHead><TableHead>Type</TableHead><TableHead>Normal side</TableHead><TableHead className="text-right">Debits</TableHead><TableHead className="text-right">Credits</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{accounts.map(a=><TableRow key={a.id}><TableCell className="font-mono">{a.code}</TableCell><TableCell className="font-medium">{a.name}{a.system_code&&<span className="ml-2 text-xs text-muted-foreground">System</span>}</TableCell><TableCell>{typeLabel[a.account_type]}</TableCell><TableCell className="capitalize">{a.normal_side}</TableCell><TableCell className="text-right tabular-nums">{formatKES(Number(a.total_debits))}</TableCell><TableCell className="text-right tabular-nums">{formatKES(Number(a.total_credits))}</TableCell><TableCell className="text-right font-medium tabular-nums">{formatKES(Number(a.balance))}</TableCell><TableCell><span className={a.is_active?"text-emerald-700":"text-muted-foreground"}>{a.is_active?"Active":"Inactive"}</span></TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card>
  <Card><CardContent className="flex flex-col gap-4 p-4"><div className="flex items-center gap-2"><Scale className="size-5 text-muted-foreground"/><div><h2 className="font-semibold">Recent journal entries</h2><p className="text-sm text-muted-foreground">Source references connect supplier bills and payments to their ledger postings.</p></div></div>
  {loading?<div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground"/></div>:journals.length===0?<div className="py-8 text-center text-sm text-muted-foreground">No journal entries have been posted yet.</div>:<div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Entry</TableHead><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Source</TableHead><TableHead className="text-right">Debits</TableHead><TableHead className="text-right">Credits</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{journals.map(j=><TableRow key={j.id}><TableCell className="font-mono">{j.entry_number}</TableCell><TableCell>{formatDate(j.entry_date)}</TableCell><TableCell>{j.description}</TableCell><TableCell>{j.source_type||"Manual"}</TableCell><TableCell className="text-right tabular-nums">{formatKES(Number(j.total_debits))}</TableCell><TableCell className="text-right tabular-nums">{formatKES(Number(j.total_credits))}</TableCell><TableCell className="capitalize">{j.status}</TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card>
 </div></BaseLayout>;
}
