import * as React from "react"
import { Banknote, Clock3, Plus, RefreshCw, ShoppingCart } from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { api } from "@/lib/api-client"
import { formatKES } from "@/lib/format"

type Register = { id:string; code:string; name:string; branch_id:string|null; branch_name:string|null; is_active:boolean; open_shift_id:string|null; opened_by:string|null; opening_float:string|number|null; opened_at:string|null }
type Shift = { id:string; register_id:string; register_code:string; register_name:string; opening_float:string|number; expected_cash:string|number|null; counted_cash:string|number|null; cash_difference:string|number|null; opened_at:string; status:"open"|"closed" }

export default function PosPage() {
  const [registers,setRegisters] = React.useState<Register[]>([])
  const [shift,setShift] = React.useState<Shift|null>(null)
  const [loading,setLoading] = React.useState(true)
  const [saving,setSaving] = React.useState(false)
  const [error,setError] = React.useState<string|null>(null)
  const [showRegisterForm,setShowRegisterForm] = React.useState(false)
  const [registerForm,setRegisterForm] = React.useState({code:"",name:""})
  const [registerId,setRegisterId] = React.useState("")
  const [openingFloat,setOpeningFloat] = React.useState("0")
  const [countedCash,setCountedCash] = React.useState("")
  const [closeNotes,setCloseNotes] = React.useState("")
  const load = React.useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [locations,current] = await Promise.all([api.get<Register[]>("/pos/registers"),api.get<Shift|null>("/pos/shifts/current")])
      setRegisters(locations); setShift(current)
      setRegisterId(current?.register_id ?? locations.find(r=>r.is_active&&!r.open_shift_id)?.id ?? "")
    } catch(e) { setError((e as {message?:string}).message ?? "Could not load POS registers and cashier shift.") }
    finally { setLoading(false) }
  },[])
  React.useEffect(()=>{void load()},[load])
  async function createRegister(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null)
    try { await api.post("/pos/registers",{code:registerForm.code.trim(),name:registerForm.name.trim()}); setRegisterForm({code:"",name:""}); setShowRegisterForm(false); await load() }
    catch(e) { setError((e as {message?:string}).message ?? "Could not create register.") }
    finally { setSaving(false) }
  }
  async function openShift(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null)
    try { await api.post("/pos/shifts/open",{registerId,openingFloat:Number(openingFloat)}); await load() }
    catch(e) { setError((e as {message?:string}).message ?? "Could not open cashier shift.") }
    finally { setSaving(false) }
  }
  async function closeShift(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(!shift)return
    setSaving(true); setError(null)
    try { await api.post("/pos/shifts/"+shift.id+"/close",{countedCash:Number(countedCash),notes:closeNotes.trim()||undefined}); setCountedCash("");setCloseNotes("");await load() }
    catch(e) { setError((e as {message?:string}).message ?? "Could not close cashier shift.") }
    finally { setSaving(false) }
  }
  const available=registers.filter(r=>r.is_active&&!r.open_shift_id)
  return <BaseLayout><div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
    <PageHeader title="Point of Sale" description="Cashier registers, shift opening and end-of-shift cash-up" action={<div className="flex gap-2"><Button variant="outline" onClick={()=>void load()} disabled={loading||saving}><RefreshCw className="mr-2 size-4"/>Refresh</Button><Button onClick={()=>setShowRegisterForm(v=>!v)}><Plus className="mr-2 size-4"/>Add register</Button></div>}/>
    {error&&<div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
    {showRegisterForm&&<Card><CardContent className="pt-5"><form onSubmit={createRegister} className="grid gap-4 sm:grid-cols-3">
      <div className="sm:col-span-3"><h2 className="font-semibold">Create POS register</h2><p className="text-sm text-muted-foreground">Register codes must be unique within your company.</p></div>
      <label className="grid gap-1.5 text-sm">Register code<Input required maxLength={32} value={registerForm.code} onChange={e=>setRegisterForm({...registerForm,code:e.target.value})} placeholder="TILL-01"/></label>
      <label className="grid gap-1.5 text-sm">Register name<Input required maxLength={120} value={registerForm.name} onChange={e=>setRegisterForm({...registerForm,name:e.target.value})} placeholder="Front counter"/></label>
      <div className="flex items-end gap-2"><Button type="submit" disabled={saving}>{saving?"Saving…":"Save register"}</Button><Button type="button" variant="outline" onClick={()=>setShowRegisterForm(false)}>Cancel</Button></div>
    </form></CardContent></Card>}
    <section className="grid gap-4 md:grid-cols-3">
      <Card><CardContent className="flex items-center gap-3 pt-5"><ShoppingCart className="size-5 text-muted-foreground"/><div><p className="text-sm text-muted-foreground">Company registers</p><p className="text-2xl font-semibold">{registers.length}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 pt-5"><Clock3 className="size-5 text-muted-foreground"/><div><p className="text-sm text-muted-foreground">Your cashier shift</p><p className="text-2xl font-semibold">{shift?"Open":"Not open"}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 pt-5"><Banknote className="size-5 text-muted-foreground"/><div><p className="text-sm text-muted-foreground">Opening float</p><p className="text-2xl font-semibold tabular-nums">{shift?formatKES(Number(shift.opening_float)):formatKES(0)}</p></div></CardContent></Card>
    </section>
    {loading?<div className="flex justify-center py-12"><LoadingSpinner/></div>:<div className="grid gap-6 lg:grid-cols-2">
      <Card><CardContent className="pt-5"><h2 className="font-semibold">Registers</h2><p className="mb-4 text-sm text-muted-foreground">Register availability and active cashier sessions.</p>
        {registers.length===0?<div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No POS registers yet. Add a register to prepare your checkout counters.</div>:<div className="space-y-3">{registers.map(r=><div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{r.name}</p><p className="text-sm text-muted-foreground">{r.code}{r.branch_name?" · "+r.branch_name:""}</p></div><span className={"rounded-full px-2.5 py-1 text-xs font-medium "+(!r.is_active?"bg-muted text-muted-foreground":r.open_shift_id?"bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200":"bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200")}>{!r.is_active?"Inactive":r.open_shift_id?"Shift open":"Available"}</span></div>)}</div>}
      </CardContent></Card>
      <Card><CardContent className="pt-5">{shift?<><h2 className="font-semibold">Close cashier shift</h2><p className="mb-4 text-sm text-muted-foreground">Count the cash physically in the drawer. The system compares it with the opening float and confirmed cash payments recorded during this shift.</p><div className="mb-4 rounded-lg bg-muted/50 p-3"><p className="font-medium">{shift.register_name} · {shift.register_code}</p><p className="text-sm text-muted-foreground">Opened {new Date(shift.opened_at).toLocaleString()}</p><p className="mt-2 text-sm">Opening float: <strong>{formatKES(Number(shift.opening_float))}</strong></p>{shift.expected_cash!==null&&<p className="text-sm">Expected cash: <strong>{formatKES(Number(shift.expected_cash))}</strong></p>}</div><form onSubmit={closeShift} className="grid gap-3"><label className="grid gap-1.5 text-sm">Counted cash (KES)<Input required type="number" min="0" step="0.01" value={countedCash} onChange={e=>setCountedCash(e.target.value)} placeholder="0.00"/></label><label className="grid gap-1.5 text-sm">Closing notes (optional)<Input value={closeNotes} onChange={e=>setCloseNotes(e.target.value)} maxLength={1000} placeholder="Cash variance explanation"/></label><Button type="submit" disabled={saving||countedCash===""}>{saving?"Closing…":"Close shift and record cash-up"}</Button></form></>:<><h2 className="font-semibold">Open cashier shift</h2><p className="mb-4 text-sm text-muted-foreground">Choose an available register and record the opening cash float before trading.</p>{available.length===0?<p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{registers.length?"All active registers are currently in use or unavailable.":"Create a register first, then open a shift."}</p>:<form onSubmit={openShift} className="grid gap-3"><label className="grid gap-1.5 text-sm">Register<select className="h-10 rounded-md border bg-background px-3" required value={registerId} onChange={e=>setRegisterId(e.target.value)}>{available.map(r=><option key={r.id} value={r.id}>{r.code} — {r.name}</option>)}</select></label><label className="grid gap-1.5 text-sm">Opening float (KES)<Input required type="number" min="0" step="0.01" value={openingFloat} onChange={e=>setOpeningFloat(e.target.value)}/></label><Button type="submit" disabled={saving||!registerId}>{saving?"Opening…":"Open cashier shift"}</Button></form>}</>}</CardContent></Card>
    </div>}
    <Card><CardContent className="flex flex-col gap-2 py-4"><h2 className="font-semibold">Checkout implementation status</h2><p className="text-sm text-muted-foreground">This first POS slice establishes company-scoped registers and audited cashier shifts. Product scanning, cart totals, stock deduction, split payments, receipts and invoice/accounting integration still need to be completed and tested before the checkout can be used for live sales.</p></CardContent></Card>
  </div></BaseLayout>
}
