import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { BaseLayout } from "@/components/layouts/base-layout";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";

export default function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = params.get("token") ?? "";
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [accepted, setAccepted] = React.useState(false);

  const accept = async () => {
    if (!token) { setError("This invitation link does not contain a token."); return; }
    setBusy(true); setError("");
    try {
      await api.post("/users-roles/invitations/accept", { token });
      setAccepted(true);
    } catch (e) {
      setError(e && typeof e === "object" && "message" in e ? String((e as {message: unknown}).message) : "The invitation could not be accepted.");
    } finally { setBusy(false); }
  };

  return <BaseLayout><div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 lg:px-6">
    <PageHeader title="Accept company invitation" description="Join a company workspace using the email address the invitation was sent to."/>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><MailCheck className="size-5"/>Invitation details</CardTitle><CardDescription>Signed in as {user?.email ?? "your account"}. The server verifies the invitation email before adding membership.</CardDescription></CardHeader><CardContent className="space-y-4">
      {error && <div role="alert" className="flex gap-2 rounded-md border border-destructive/30 p-3 text-sm text-destructive"><AlertCircle className="size-4 shrink-0"/>{error}</div>}
      {accepted ? <div role="status" className="space-y-3"><p className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-5 text-emerald-600"/>Invitation accepted. Your company membership is active.</p><p className="text-sm text-muted-foreground">Switch to the invited company from your company selector if it is not your current workspace.</p><Button onClick={()=>navigate("/dashboard",{replace:true})}>Continue to dashboard</Button></div>
      : <><p className="text-sm text-muted-foreground">Invitation links are single-use and expire after seven days. If this account uses a different email address, sign out and sign in with the invited address before continuing.</p><Button onClick={()=>void accept()} disabled={busy||!token}>{busy&&<Loader2 className="mr-2 size-4 animate-spin"/>}Accept invitation</Button></>}
    </CardContent></Card>
  </div></BaseLayout>;
}
