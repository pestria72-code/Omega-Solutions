import * as React from "react";
import { RefreshCw, UserPlus, Users } from "lucide-react";
import { BaseLayout } from "@/components/layouts/base-layout";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { api } from "@/lib/api-client";

type Employee={id:string;employee_number:string;first_name:string;last_name:string;work_email:string|null;phone:string|null;job_title:string|null;department:string|null;employment_status:string;hire_date:string|null;branch_name?:string|null};
const blank={employeeNumber:"",firstName:"",lastName:"",workEmail:"",phone:"",jobTitle:"",department:"",hireDate:""};
const message=(e:unknown)=>e&&typeof e==="object"&&"message" in e?String((e as {message:unknown}).message):"The request failed. Please try again.";

export default function EmployeesPage(){
 const [rows,setRows]=React.useState<Employee[]>([]);
 const [loading,setLoading]=React.useState(true);
 const [saving,setSaving]=React.useState(false);
 const [error,setError]=React.useState<string|null>(null);
 const [formError,setFormError]=React.useState<string|null>(null);
 const [form,setForm]=React.useState(blank);
 const load=React.useCallback(async()=>{setLoading(true);setError(null);try{setRows(await api.get<Employee[]>("/employees"));}catch(e){setError(message(e));}finally{setLoading(false);}},[]);
 React.useEffect(()=>{void load();},[load]);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setFormError(null);try{await api.post("/employees",{...form,workEmail:form.workEmail.trim()||undefined,phone:form.phone.trim()||undefined,jobTitle:form.jobTitle.trim()||undefined,department:form.department.trim()||undefined,hireDate:form.hireDate||undefined});setForm(blank);await load();}catch(e){setFormError(message(e));}finally{setSaving(false);}}
 return <BaseLayout><div className="flex flex-col gap-6 px-4 lg:px-6">
  <PageHeader title="Employees" description="Manage employee records for the active company." />
  <Card><CardHeader><CardTitle className="text-base">Add employee</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
   <div className="grid gap-2"><Label>Employee number *</Label><Input required maxLength={50} value={form.employeeNumber} onChange={e=>setForm({...form,employeeNumber:e.target.value})}/></div>
   <div className="grid gap-2"><Label>First name *</Label><Input required value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})}/></div>
   <div className="grid gap-2"><Label>Last name *</Label><Input required value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})}/></div>
   <div className="grid gap-2"><Label>Work email</Label><Input type="email" value={form.workEmail} onChange={e=>setForm({...form,workEmail:e.target.value})}/></div>
   <div className="grid gap-2"><Label>Phone</Label><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
   <div className="grid gap-2"><Label>Job title</Label><Input value={form.jobTitle} onChange={e=>setForm({...form,jobTitle:e.target.value})}/></div>
   <div className="grid gap-2"><Label>Department</Label><Input value={form.department} onChange={e=>setForm({...form,department:e.target.value})}/></div>
   <div className="grid gap-2"><Label>Hire date</Label><Input type="date" value={form.hireDate} onChange={e=>setForm({...form,hireDate:e.target.value})}/></div>
   <div className="flex items-end"><Button type="submit" disabled={saving}>{saving?<LoadingSpinner size="sm"/>:<UserPlus className="mr-2 size-4"/>}{saving?"Saving…":"Add employee"}</Button></div>
   {formError&&<p role="alert" className="text-sm text-destructive sm:col-span-2 lg:col-span-3">{formError}</p>}
  </form></CardContent></Card>
  <Card><CardContent className="p-0">
   <div className="flex items-center justify-between gap-3 p-4"><h2 className="font-semibold">Employee directory <span className="text-muted-foreground font-normal">({rows.length})</span></h2><Button variant="outline" size="sm" onClick={()=>void load()} disabled={loading}><RefreshCw className="mr-2 size-4"/>Refresh</Button></div>
   {loading?<div className="flex justify-center p-12"><LoadingSpinner/></div>:error?<div className="p-6 text-sm text-destructive" role="alert">{error}<Button className="ml-3" variant="outline" size="sm" onClick={()=>void load()}>Retry</Button></div>:rows.length===0?<EmptyState icon={Users} title="No employees yet" description="Add your first employee above. No sample employee records are loaded."/>:
   <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-y bg-muted/40 text-left"><th className="p-3">Employee</th><th className="p-3">Number</th><th className="p-3">Role / Department</th><th className="p-3">Contact</th><th className="p-3">Status</th><th className="p-3">Hire date</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-b last:border-0"><td className="p-3 font-medium">{row.first_name} {row.last_name}</td><td className="p-3">{row.employee_number}</td><td className="p-3">{row.job_title||"—"}<div className="text-muted-foreground">{row.department||"—"}</div></td><td className="p-3">{row.work_email||row.phone||"—"}</td><td className="p-3 capitalize">{row.employment_status.replace("_"," ")}</td><td className="p-3">{row.hire_date?row.hire_date.slice(0,10):"—"}</td></tr>)}</tbody></table></div>}
  </CardContent></Card>
 </div></BaseLayout>;
}
