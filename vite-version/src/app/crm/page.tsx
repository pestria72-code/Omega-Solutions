import * as React from "react"
import { Plus, Search, Users, AlertCircle, RefreshCw } from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { api } from "@/lib/api-client"
import { formatKES, formatDate } from "@/lib/format"

type Lead = {
  id: string
  contact_name: string
  organization_name: string | null
  email: string | null
  phone: string | null
  source: string | null
  status: "new" | "qualified" | "unqualified" | "converted"
  estimated_value: number | string
  currency: string
  notes: string | null
  created_at: string
}
type Pipeline = { leads: Array<{ status: string; count: number; value: string | number }>; opportunities: Array<{ stage: string; count: number; value: string | number; weighted_value: string | number }>; currency: string }
const blankForm = { contactName: "", organizationName: "", email: "", phone: "", source: "", estimatedValue: "0", notes: "" }

export default function CrmPage() {
  const [leads, setLeads] = React.useState<Lead[]>([])
  const [pipeline, setPipeline] = React.useState<Pipeline | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [form, setForm] = React.useState(blankForm)
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("search", search.trim())
      if (status !== "all") params.set("status", status)
      const [leadRows, summary] = await Promise.all([
        api.get<Lead[]>(`/crm/leads${params.size ? `?${params.toString()}` : ""}`),
        api.get<Pipeline>("/crm/pipeline"),
      ])
      setLeads(leadRows)
      setPipeline(summary)
    } catch (e) {
      const message = e && typeof e === "object" && "message" in e ? String(e.message) : "Could not load CRM data."
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [search, status])

  React.useEffect(() => { void load() }, [load])

  const leadCount = pipeline?.leads.reduce((sum, item) => sum + Number(item.count), 0) ?? leads.length
  const leadValue = pipeline?.leads.reduce((sum, item) => sum + Number(item.value), 0) ?? 0
  const qualifiedCount = pipeline?.leads.filter(item => item.status === "qualified").reduce((sum, item) => sum + Number(item.count), 0) ?? 0
  const opportunityValue = pipeline?.opportunities.reduce((sum, item) => sum + Number(item.weighted_value), 0) ?? 0

  async function saveLead() {
    if (!form.contactName.trim()) { setError("Contact name is required."); return }
    setSaving(true)
    setError(null)
    try {
      await api.post<Lead>("/crm/leads", {
        contactName: form.contactName.trim(),
        organizationName: form.organizationName.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        source: form.source.trim() || undefined,
        estimatedValue: Math.max(0, Number(form.estimatedValue) || 0),
        currency: "KES",
        notes: form.notes.trim() || undefined,
      })
      setDialogOpen(false)
      setForm(blankForm)
      await load()
    } catch (e) {
      setError(e && typeof e === "object" && "message" in e ? String(e.message) : "Could not save the lead.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <BaseLayout>
      <div className="flex flex-col gap-6 px-4 lg:px-6">
        <PageHeader
          title="Customer relationship management"
          description="Track prospects, qualify leads and build a healthier sales pipeline."
          action={<Button onClick={() => { setForm(blankForm); setDialogOpen(true) }}><Plus className="size-4" /> Add lead</Button>}
        />

        {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" /><span className="flex-1">{error}</span><Button size="sm" variant="ghost" onClick={() => void load()}><RefreshCw className="size-3.5" /> Retry</Button></div>}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total leads", value: String(leadCount), hint: "All statuses" },
            { label: "Qualified leads", value: String(qualifiedCount), hint: "Ready for follow-up" },
            { label: "Lead value", value: formatKES(leadValue), hint: "Estimated potential" },
            { label: "Weighted opportunities", value: formatKES(opportunityValue), hint: "Probability-adjusted" },
          ].map((metric) => <Card key={metric.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{metric.label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p></CardContent></Card>)}
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-8" placeholder="Search contact, company, email or phone…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search leads" /></div>
              <select aria-label="Filter leads by status" value={status} onChange={e => setStatus(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm sm:w-48">
                <option value="all">All statuses</option><option value="new">New</option><option value="qualified">Qualified</option><option value="unqualified">Unqualified</option><option value="converted">Converted</option>
              </select>
            </div>
            {loading ? <div className="flex justify-center py-12"><LoadingSpinner /></div> : leads.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center"><div className="rounded-full bg-muted p-3"><Users className="size-6 text-muted-foreground" /></div><p className="font-medium">No leads found</p><p className="max-w-sm text-sm text-muted-foreground">Add a prospect to start tracking your sales pipeline, or adjust the current search and filters.</p><Button variant="outline" onClick={() => { setForm(blankForm); setDialogOpen(true) }}><Plus className="size-4" /> Add first lead</Button></div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Contact</TableHead><TableHead className="hidden md:table-cell">Organization</TableHead><TableHead className="hidden lg:table-cell">Contact details</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Est. value</TableHead><TableHead className="hidden sm:table-cell">Created</TableHead></TableRow></TableHeader>
                <TableBody>{leads.map(lead => <TableRow key={lead.id}>
                  <TableCell><div className="font-medium">{lead.contact_name}</div><div className="mt-1 text-xs text-muted-foreground md:hidden">{lead.organization_name || "Independent contact"}</div></TableCell>
                  <TableCell className="hidden md:table-cell">{lead.organization_name || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell"><div>{lead.email || "—"}</div><div className="text-xs text-muted-foreground">{lead.phone || ""}</div></TableCell>
                  <TableCell><StatusBadge status={lead.status.charAt(0).toUpperCase() + lead.status.slice(1)} /></TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatKES(Number(lead.estimated_value))}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{formatDate(lead.created_at)}</TableCell>
                </TableRow>)}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add CRM lead</DialogTitle><DialogDescription>Save a real prospect to your company’s CRM pipeline. Values are recorded in Kenyan shillings (KES).</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="crm-contact">Contact name *</Label><Input id="crm-contact" autoFocus value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} /></div>
            <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="crm-org">Organization</Label><Input id="crm-org" value={form.organizationName} onChange={e => setForm({ ...form, organizationName: e.target.value })} /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="crm-email">Email</Label><Input id="crm-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="crm-phone">Phone</Label><Input id="crm-phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="crm-source">Lead source</Label><Input id="crm-source" placeholder="Referral, website…" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="crm-value">Estimated value (KSh)</Label><Input id="crm-value" type="number" min="0" value={form.estimatedValue} onChange={e => setForm({ ...form, estimatedValue: e.target.value })} /></div>
            <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="crm-notes">Notes</Label><textarea id="crm-notes" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
          </div>
          <DialogFooter><DialogClose render={<Button variant="outline">Cancel</Button>} /><Button onClick={() => void saveLead()} disabled={saving || !form.contactName.trim()}>{saving ? <LoadingSpinner className="size-4" /> : "Save lead"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
