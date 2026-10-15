import * as React from "react";
import { Loader2, RefreshCw, MapPin, ClipboardList, Clock3 } from "lucide-react";
import { BaseLayout } from "@/components/layouts/base-layout";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { api } from "@/lib/api-client";

type Employee = { id: string; employee_number: string; first_name: string; last_name: string; employment_status: string };
type Site = { id: string; site_code: string; site_name: string; client_name: string; address: string | null; is_active: boolean };
type Assignment = { id: string; employee_id: string; employee_number: string; first_name: string; last_name: string; site_name: string; client_name: string; assignment_title: string | null; pay_basis: string; pay_rate: string | number; currency: string; start_date: string; end_date: string | null; status: string };
type Attendance = { id: string; employee_id: string; employee_number: string; first_name: string; last_name: string; punch_type: "in" | "out"; punched_at: string; site_name: string | null; client_name: string | null };
const errorMessage = (e: unknown) => e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "The request failed. Please try again.";
const fieldClass = "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm";
const today = () => new Date().toISOString().slice(0, 10);

export default function WorkforcePage() {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [sites, setSites] = React.useState<Site[]>([]);
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [attendance, setAttendance] = React.useState<Attendance[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingSite, setSavingSite] = React.useState(false);
  const [savingAssignment, setSavingAssignment] = React.useState(false);
  const [savingPunch, setSavingPunch] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [siteForm, setSiteForm] = React.useState({ siteCode: "", siteName: "", clientName: "", address: "" });
  const [assignmentForm, setAssignmentForm] = React.useState({ employeeId: "", siteId: "", assignmentTitle: "", payBasis: "monthly", payRate: "", currency: "KES", startDate: today(), endDate: "" });
  const [punchForm, setPunchForm] = React.useState({ employeeId: "", punchType: "in" as "in" | "out", note: "" });
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const attendanceQuery = new URLSearchParams();
    if (from) attendanceQuery.set("from", from);
    if (to) attendanceQuery.set("to", to);
    const suffix = attendanceQuery.size ? `?${attendanceQuery.toString()}` : "";
    const results = await Promise.allSettled([
      api.get<Employee[]>("/employees"),
      api.get<Site[]>("/client-sites"),
      api.get<Assignment[]>("/employee-assignments"),
      api.get<Attendance[]>(`/attendance${suffix}`),
    ]);
    const messages: string[] = [];
    if (results[0].status === "fulfilled") setEmployees(results[0].value); else messages.push(`Employees: ${errorMessage(results[0].reason)}`);
    if (results[1].status === "fulfilled") setSites(results[1].value); else messages.push(`Sites: ${errorMessage(results[1].reason)}`);
    if (results[2].status === "fulfilled") setAssignments(results[2].value); else messages.push(`Assignments: ${errorMessage(results[2].reason)}`);
    if (results[3].status === "fulfilled") setAttendance(results[3].value); else messages.push(`Attendance: ${errorMessage(results[3].reason)}`);
    setError(messages.length ? messages.join(" · ") : null);
    setLoading(false);
  }, [from, to]);

  React.useEffect(() => { void load(); }, [load]);

  async function createSite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSavingSite(true); setFormError(null);
    try {
      await api.post("/client-sites", { ...siteForm, address: siteForm.address.trim() || undefined });
      setSiteForm({ siteCode: "", siteName: "", clientName: "", address: "" });
      await load();
    } catch (e) { setFormError(errorMessage(e)); } finally { setSavingSite(false); }
  }

  async function createAssignment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSavingAssignment(true); setFormError(null);
    try {
      await api.post("/employee-assignments", { ...assignmentForm, payRate: Number(assignmentForm.payRate), endDate: assignmentForm.endDate || undefined, assignmentTitle: assignmentForm.assignmentTitle.trim() || undefined });
      setAssignmentForm({ employeeId: "", siteId: "", assignmentTitle: "", payBasis: "monthly", payRate: "", currency: "KES", startDate: today(), endDate: "" });
      await load();
    } catch (e) { setFormError(errorMessage(e)); } finally { setSavingAssignment(false); }
  }

  async function recordPunch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSavingPunch(true); setFormError(null);
    try {
      await api.post("/attendance/punch", { ...punchForm, note: punchForm.note.trim() || undefined, source: "web" });
      setPunchForm({ employeeId: "", punchType: "in", note: "" });
      await load();
    } catch (e) { setFormError(errorMessage(e)); } finally { setSavingPunch(false); }
  }

  const activeEmployees = employees.filter((employee) => !["terminated", "inactive"].includes(employee.employment_status));
  const activeSites = sites.filter((site) => site.is_active);

  return <BaseLayout><div className="flex flex-col gap-6 px-4 lg:px-6">
    <PageHeader title="Workforce" description="Manage client sites, employee assignments, and attendance using the active company’s records." />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">All records are scoped to the authenticated company. Nothing is pre-filled with sample data.</p>
      <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 size-4" />Refresh data</Button>
    </div>
    {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
    {formError && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{formError}</div>}
    {loading ? <div className="flex justify-center py-12"><LoadingSpinner /></div> : <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-4"><UsersIcon /><div><p className="text-sm text-muted-foreground">Active employees</p><p className="text-2xl font-semibold">{activeEmployees.length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><MapPin className="size-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Client sites</p><p className="text-2xl font-semibold">{sites.length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><Clock3 className="size-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Attendance events</p><p className="text-2xl font-semibold">{attendance.length}</p></div></CardContent></Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="size-4" />Client sites</CardTitle></CardHeader><CardContent>
          <form onSubmit={createSite} className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label>Site code *</Label><Input required maxLength={40} value={siteForm.siteCode} onChange={e => setSiteForm({ ...siteForm, siteCode: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Site name *</Label><Input required value={siteForm.siteName} onChange={e => setSiteForm({ ...siteForm, siteName: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Client name *</Label><Input required value={siteForm.clientName} onChange={e => setSiteForm({ ...siteForm, clientName: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Address</Label><Input value={siteForm.address} onChange={e => setSiteForm({ ...siteForm, address: e.target.value })} /></div>
            <div className="sm:col-span-2"><Button type="submit" disabled={savingSite}>{savingSite && <Loader2 className="mr-2 size-4 animate-spin" />}Create site</Button></div>
          </form>
          <div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-y bg-muted/40 text-left"><th className="p-2">Site</th><th className="p-2">Client</th><th className="p-2">Status</th></tr></thead><tbody>{sites.map(site => <tr key={site.id} className="border-b last:border-0"><td className="p-2"><span className="font-medium">{site.site_name}</span><div className="text-xs text-muted-foreground">{site.site_code}</div></td><td className="p-2">{site.client_name}</td><td className="p-2">{site.is_active ? "Active" : "Inactive"}</td></tr>)}</tbody></table>{!sites.length && <p className="p-4 text-sm text-muted-foreground">No client sites for this company yet.</p>}</div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="size-4" />Create employee assignment</CardTitle></CardHeader><CardContent>
          <form onSubmit={createAssignment} className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2"><Label>Employee *</Label><select required className={fieldClass} value={assignmentForm.employeeId} onChange={e => setAssignmentForm({ ...assignmentForm, employeeId: e.target.value })}><option value="">Select an active employee</option>{activeEmployees.map(e => <option key={e.id} value={e.id}>{e.employee_number} · {e.first_name} {e.last_name}</option>)}</select></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label>Client site *</Label><select required className={fieldClass} value={assignmentForm.siteId} onChange={e => setAssignmentForm({ ...assignmentForm, siteId: e.target.value })}><option value="">Select a site</option>{activeSites.map(s => <option key={s.id} value={s.id}>{s.site_name} · {s.client_name}</option>)}</select></div>
            <div className="grid gap-1.5"><Label>Assignment title</Label><Input value={assignmentForm.assignmentTitle} onChange={e => setAssignmentForm({ ...assignmentForm, assignmentTitle: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Pay basis *</Label><select className={fieldClass} value={assignmentForm.payBasis} onChange={e => setAssignmentForm({ ...assignmentForm, payBasis: e.target.value })}><option value="monthly">Monthly</option><option value="daily">Daily</option><option value="hourly">Hourly</option><option value="per_shift">Per shift</option></select></div>
            <div className="grid gap-1.5"><Label>Pay rate *</Label><Input required type="number" min="0" step="0.01" value={assignmentForm.payRate} onChange={e => setAssignmentForm({ ...assignmentForm, payRate: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Currency</Label><Input maxLength={3} value={assignmentForm.currency} onChange={e => setAssignmentForm({ ...assignmentForm, currency: e.target.value.toUpperCase() })} /></div>
            <div className="grid gap-1.5"><Label>Start date *</Label><Input required type="date" value={assignmentForm.startDate} onChange={e => setAssignmentForm({ ...assignmentForm, startDate: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>End date</Label><Input type="date" min={assignmentForm.startDate} value={assignmentForm.endDate} onChange={e => setAssignmentForm({ ...assignmentForm, endDate: e.target.value })} /></div>
            <div className="sm:col-span-2"><Button type="submit" disabled={savingAssignment || !activeEmployees.length || !activeSites.length}>{savingAssignment && <Loader2 className="mr-2 size-4 animate-spin" />}Create assignment</Button></div>
            {(!activeEmployees.length || !activeSites.length) && <p className="sm:col-span-2 text-xs text-muted-foreground">An active employee and active client site are required before an assignment can be created.</p>}
          </form>
          <div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-y bg-muted/40 text-left"><th className="p-2">Employee</th><th className="p-2">Site</th><th className="p-2">Pay</th><th className="p-2">Dates / status</th></tr></thead><tbody>{assignments.map(a => <tr key={a.id} className="border-b last:border-0"><td className="p-2">{a.first_name} {a.last_name}<div className="text-xs text-muted-foreground">{a.employee_number}</div></td><td className="p-2">{a.site_name}<div className="text-xs text-muted-foreground">{a.client_name}</div></td><td className="p-2">{a.currency} {Number(a.pay_rate).toLocaleString()}<div className="text-xs text-muted-foreground">{a.pay_basis.replace("_", " ")}</div></td><td className="p-2"><span className="capitalize">{a.status}</span><div className="text-xs text-muted-foreground">{String(a.start_date).slice(0,10)} – {a.end_date ? String(a.end_date).slice(0,10) : "Open"}</div></td></tr>)}</tbody></table>{!assignments.length && <p className="p-4 text-sm text-muted-foreground">No employee assignments for this company yet.</p>}</div>
        </CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock3 className="size-4" />Attendance</CardTitle></CardHeader><CardContent>
        <form onSubmit={recordPunch} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1.5"><Label>Employee *</Label><select required className={fieldClass} value={punchForm.employeeId} onChange={e => setPunchForm({ ...punchForm, employeeId: e.target.value })}><option value="">Select employee</option>{activeEmployees.map(e => <option key={e.id} value={e.id}>{e.employee_number} · {e.first_name} {e.last_name}</option>)}</select></div>
          <div className="grid gap-1.5"><Label>Action *</Label><select className={fieldClass} value={punchForm.punchType} onChange={e => setPunchForm({ ...punchForm, punchType: e.target.value as "in" | "out" })}><option value="in">Clock in</option><option value="out">Clock out</option></select></div>
          <div className="grid gap-1.5"><Label>Note</Label><Input value={punchForm.note} onChange={e => setPunchForm({ ...punchForm, note: e.target.value })} /></div>
          <div className="flex items-end"><Button type="submit" disabled={savingPunch || !activeEmployees.length}>{savingPunch && <Loader2 className="mr-2 size-4 animate-spin" />}Record attendance</Button></div>
        </form>
        <div className="mt-5 flex flex-wrap items-end gap-3"><div className="grid gap-1.5"><Label>From</Label><Input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} /></div><div className="grid gap-1.5"><Label>To</Label><Input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></div><Button variant="outline" onClick={() => { setFrom(""); setTo(""); }}>Clear date filters</Button></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-y bg-muted/40 text-left"><th className="p-2">Employee</th><th className="p-2">Event</th><th className="p-2">Date & time</th><th className="p-2">Client site</th></tr></thead><tbody>{attendance.map(a => <tr key={a.id} className="border-b last:border-0"><td className="p-2">{a.first_name} {a.last_name}<div className="text-xs text-muted-foreground">{a.employee_number}</div></td><td className="p-2 capitalize">{a.punch_type === "in" ? "Clock in" : "Clock out"}</td><td className="p-2">{new Date(a.punched_at).toLocaleString()}</td><td className="p-2">{a.site_name || "—"}</td></tr>)}</tbody></table>{!attendance.length && <p className="p-4 text-sm text-muted-foreground">No attendance events match this company and date range.</p>}</div>
      </CardContent></Card>
    </>}
  </div></BaseLayout>;
}

function UsersIcon() {
  return <ClipboardList className="size-5 text-muted-foreground" />;
}
