import * as React from "react";
import { AlertCircle, Loader2, RefreshCw, Shield, UserCog } from "lucide-react";
import { BaseLayout } from "@/components/layouts/base-layout";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";

type Role = "owner" | "admin" | "manager" | "staff" | "viewer";
type Member = {
  membership_id: string; user_id: string; company_id: string; branch_id: string | null;
  role: Role; is_active: boolean; full_name: string; email: string; phone: string | null;
  last_login_at: string | null; user_created_at: string; branch_name: string | null;
  permissions: string[];
};
type RoleInfo = { role: Role; permissions: string[] };
const roles: Role[] = ["admin", "manager", "staff", "viewer"];
const title = (role: string) => role.charAt(0).toUpperCase() + role.slice(1);
function errorText(e: unknown) {
  return e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Request failed. Please try again.";
}
export default function UsersRolesPage() {
  const { user } = useAuth();
  const [members, setMembers] = React.useState<Member[]>([]);
  const [roleInfo, setRoleInfo] = React.useState<RoleInfo[]>([]);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const canManage = user?.role === "owner" || user?.role === "admin";
  const refresh = React.useCallback(async () => {
    setLoading(true); setError(""); setNotice("");
    try {
      const rows = await api.get<Member[]>("/users-roles");
      setMembers(rows);
      if (canManage) {
        try { setRoleInfo(await api.get<RoleInfo[]>("/users-roles/roles")); }
        catch { setRoleInfo([]); }
      }
    } catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }, [canManage]);
  React.useEffect(() => { void refresh(); }, [refresh]);
  const changeRole = async (member: Member, role: Role) => {
    if (role === member.role) return;
    setSaving(member.membership_id); setError(""); setNotice("");
    try {
      await api.patch("/users-roles/" + member.membership_id + "/role", { role });
      setNotice("Role updated for " + member.full_name + ".");
      await refresh();
    } catch (e) { setError(errorText(e)); }
    finally { setSaving(""); }
  };
  const filtered = members.filter(m => (m.full_name + " " + m.email + " " + (m.branch_name ?? "")).toLowerCase().includes(search.toLowerCase()));
  return <BaseLayout><div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 lg:px-6">
    <PageHeader title="Users & Roles" description="Company membership, access roles and enforced permissions" action={<Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className="mr-2 size-4"/>Refresh</Button>}/>
    {error && <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0"/>{error}</div>}
    {notice && <div role="status" className="rounded-md border p-3 text-sm">{notice}</div>}
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserCog className="size-4"/>Company users</CardTitle><CardDescription>Live memberships from the active company. Other companies' users are not shown.</CardDescription></CardHeader><CardContent>
      <div className="mb-4"><Label htmlFor="users-search">Search users</Label><Input id="users-search" className="mt-2 max-w-md" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, email or branch"/></div>
      {loading ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin"/>Loading company users…</div>
      : filtered.length === 0 ? <div className="py-10 text-center text-sm text-muted-foreground">{members.length ? "No users match this search." : "No company memberships were returned for your account."}</div>
      : <div className="space-y-3">{filtered.map(m=><div key={m.membership_id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0"><p className="font-semibold">{m.full_name}</p><p className="break-all text-sm text-muted-foreground">{m.email}</p><p className="mt-1 text-xs text-muted-foreground">{m.branch_name ?? "All branches / no branch assigned"} · {m.is_active ? "Active membership" : "Inactive membership"} · {m.last_login_at ? "Last login " + new Date(m.last_login_at).toLocaleString() : "No recorded login"}</p></div>
        <div className="flex items-center gap-3"><span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{title(m.role)}</span>
        {canManage && m.role !== "owner" && m.user_id !== user?.userId && <div className="flex items-center gap-2"><Label className="sr-only" htmlFor={"role-"+m.membership_id}>Change role for {m.full_name}</Label><select id={"role-"+m.membership_id} aria-label={"Change role for "+m.full_name} className="h-9 rounded-md border bg-background px-3 text-sm" value={m.role} disabled={saving===m.membership_id} onChange={e=>void changeRole(m,e.target.value as Role)}>{roles.filter(r=>r!=="admin"||user?.role==="owner").map(r=><option key={r} value={r}>{title(r)}</option>)}</select>{saving===m.membership_id&&<Loader2 className="size-4 animate-spin"/>}</div>}
        </div>
      </div>)}</div>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Shield className="size-4"/>Role permissions</CardTitle><CardDescription>These are the permissions assigned to each system role in the backend. API endpoints enforce them on every request.</CardDescription></CardHeader><CardContent>
      {!canManage ? <p className="text-sm text-muted-foreground">Owner or admin access is required to view the full role catalog.</p>
      : roleInfo.length === 0 ? <p className="text-sm text-muted-foreground">Role permission catalog is unavailable. Refresh or verify administrator access.</p>
      : <div className="grid max-w-4xl gap-2 sm:grid-cols-2">{roleInfo.map(r=><details key={r.role} className="group rounded-lg border bg-card px-3 py-2"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-1 [&::-webkit-details-marker]:hidden"><span className="font-medium">{title(r.role)}</span><span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"><span>{r.permissions.length} permissions</span><span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span></span></summary><ul className="mt-2 space-y-1 border-t pt-2">{r.permissions.map(p=><li key={p} className="break-words text-sm text-muted-foreground">{p}</li>)}</ul></details>)}</div>}
    </CardContent></Card>
  </div></BaseLayout>;
}
