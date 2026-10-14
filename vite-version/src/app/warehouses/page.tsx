import * as React from "react"
import { Building, MapPin, Package, Plus, RefreshCw } from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { api } from "@/lib/api-client"
import { formatNumber } from "@/lib/format"

type Warehouse = {
  id: string; code: string; name: string; location: string | null; capacity: string | number
  is_active: boolean; branch_name: string | null; product_count: string | number; total_quantity: string | number
}
const emptyForm = { code: "", name: "", location: "", capacity: "0" }

export default function WarehousesPage() {
  const [warehouses,setWarehouses] = React.useState<Warehouse[]>([])
  const [loading,setLoading] = React.useState(true)
  const [error,setError] = React.useState<string | null>(null)
  const [showForm,setShowForm] = React.useState(false)
  const [saving,setSaving] = React.useState(false)
  const [form,setForm] = React.useState(emptyForm)
  const load = React.useCallback(async () => {
    setLoading(true); setError(null)
    try { setWarehouses(await api.get<Warehouse[]>("/inventory/warehouses")) }
    catch (e) { setError((e as {message?:string}).message ?? "Could not load warehouses.") }
    finally { setLoading(false) }
  },[])
  React.useEffect(()=>{void load()},[load])
  async function createWarehouse(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null)
    try {
      await api.post("/inventory/warehouses",{code:form.code.trim(),name:form.name.trim(),location:form.location.trim()||undefined,capacity:Number(form.capacity||0)})
      setForm(emptyForm);setShowForm(false);await load()
    } catch(e) { setError((e as {message?:string}).message ?? "Could not create warehouse.") }
    finally { setSaving(false) }
  }
  const active=warehouses.filter(w=>w.is_active).length
  const units=warehouses.reduce((sum,w)=>sum+Number(w.total_quantity||0),0)
  return <BaseLayout><div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
    <PageHeader title="Warehouses" description="Manage company warehouses and branch stock locations" action={<div className="flex gap-2"><Button variant="outline" onClick={()=>void load()} disabled={loading}><RefreshCw className="mr-2 size-4"/>Refresh</Button><Button onClick={()=>setShowForm(v=>!v)}><Plus className="mr-2 size-4"/>Add warehouse</Button></div>}/>
    {error&&<div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
    {showForm&&<Card><CardContent className="pt-5"><form onSubmit={createWarehouse} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <label className="grid gap-1.5 text-sm">Warehouse code<Input required maxLength={24} value={form.code} onChange={e=>setForm({...form,code:e.target.value})} placeholder="NBO-MAIN"/></label>
      <label className="grid gap-1.5 text-sm">Warehouse name<Input required maxLength={160} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nairobi Main Store"/></label>
      <label className="grid gap-1.5 text-sm">Location / address<Input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Industrial Area, Nairobi"/></label>
      <label className="grid gap-1.5 text-sm">Capacity (optional)<Input type="number" min="0" step="0.001" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})}/></label>
      <div className="flex gap-2 md:col-span-2 xl:col-span-4"><Button type="submit" disabled={saving}>{saving?"Saving…":"Save warehouse"}</Button><Button type="button" variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button></div>
    </form></CardContent></Card>}
    <section className="grid gap-4 sm:grid-cols-3">
      <Card><CardContent className="flex items-center gap-3 pt-4"><Building className="size-5 text-muted-foreground"/><div><p className="text-sm text-muted-foreground">Total warehouses</p><p className="text-2xl font-semibold">{formatNumber(warehouses.length)}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 pt-4"><MapPin className="size-5 text-muted-foreground"/><div><p className="text-sm text-muted-foreground">Active locations</p><p className="text-2xl font-semibold">{formatNumber(active)}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 pt-4"><Package className="size-5 text-muted-foreground"/><div><p className="text-sm text-muted-foreground">Units currently held</p><p className="text-2xl font-semibold tabular-nums">{formatNumber(units)}</p></div></CardContent></Card>
    </section>
    <Card><CardContent className="pt-4">{loading?<div className="flex justify-center py-12"><LoadingSpinner/></div>:warehouses.length===0?<div className="py-12 text-center text-sm text-muted-foreground">No warehouses yet. Create your first location to start tracking stock.</div>:<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="px-3 py-3 font-medium">Warehouse</th><th className="px-3 py-3 font-medium">Code</th><th className="px-3 py-3 font-medium">Branch</th><th className="px-3 py-3 text-right font-medium">Capacity</th><th className="px-3 py-3 text-right font-medium">Products</th><th className="px-3 py-3 text-right font-medium">Quantity</th><th className="px-3 py-3 font-medium">Status</th></tr></thead><tbody>{warehouses.map(w=><tr key={w.id} className="border-b last:border-0"><td className="px-3 py-3"><div className="font-medium">{w.name}</div><div className="text-xs text-muted-foreground">{w.location||"No location provided"}</div></td><td className="px-3 py-3 font-mono text-xs">{w.code}</td><td className="px-3 py-3">{w.branch_name||"Company-wide"}</td><td className="px-3 py-3 text-right tabular-nums">{Number(w.capacity)>0?formatNumber(Number(w.capacity)):"—"}</td><td className="px-3 py-3 text-right tabular-nums">{formatNumber(Number(w.product_count||0))}</td><td className="px-3 py-3 text-right tabular-nums">{formatNumber(Number(w.total_quantity||0))}</td><td className="px-3 py-3"><span className={w.is_active?"rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-300":"rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"}>{w.is_active?"Active":"Inactive"}</span></td></tr>)}</tbody></table></div>}</CardContent></Card>
  </div></BaseLayout>
}
