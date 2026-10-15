import * as React from "react";
import { AlertCircle, Banknote, CheckCircle2, Loader2, RefreshCw, Receipt } from "lucide-react";
import { BaseLayout } from "@/components/layouts/base-layout";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { formatDateTime, formatKES } from "@/lib/format";
import type { InvoiceApiRow, InvoicePaymentApiRow } from "@/lib/api-types";

type PaymentRecord = InvoicePaymentApiRow & { invoice_number: string; customer_name: string };
function errorMessage(error: unknown) {
  return error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message : "Unable to load payment records. Please try again.";
}
const methodLabel: Record<InvoicePaymentApiRow["method"], string> = {
  mpesa: "M-Pesa", bank: "Bank transfer", cash: "Cash", card: "Card", cheque: "Cheque",
};

export default function PaymentsPage() {
  const { user } = useAuth();
  const canVerifyPayments = Boolean(user?.permissions.includes("payments:verify"));
  const canReconcilePayments = Boolean(user?.permissions.includes("payments:reconcile"));
  const [payments, setPayments] = React.useState<PaymentRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [invoiceCount, setInvoiceCount] = React.useState(0);
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState("");
  const [reconcilingId, setReconcilingId] = React.useState<string | null>(null);
  const [statementReferences, setStatementReferences] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    setLoading(true); setError("");
    try {
      const invoices = await api.get<InvoiceApiRow[]>("/invoices");
      setInvoiceCount(invoices.length);
      // The current API exposes payment detail on each invoice, so load the company-scoped
      // invoice details and flatten their persisted payment records.
      const details = await Promise.all(invoices.map((invoice) => api.get<InvoiceApiRow>(`/invoices/${invoice.id}`)));
      const rows = details.flatMap((invoice) => (invoice.payments ?? []).map((payment) => ({
        ...payment, invoice_number: invoice.invoice_number, customer_name: invoice.customer_name,
      })));
      rows.sort((a, b) => new Date(b.paid_at || b.created_at).getTime() - new Date(a.paid_at || a.created_at).getTime());
      setPayments(rows);
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const reconcilePayment = async (payment: PaymentRecord) => {
    const statementReference = (statementReferences[payment.id] || "").trim();
    if (!statementReference) { setActionError("Enter the matching bank statement reference before reconciling."); return; }
    setReconcilingId(payment.id); setActionError("");
    try {
      await api.post<InvoiceApiRow>(`/invoices/${payment.invoice_id}/payments/${payment.id}/reconcile`, { statementReference });
      setStatementReferences((current) => ({ ...current, [payment.id]: "" }));
      await load();
    } catch (err) { setActionError(errorMessage(err)); }
    finally { setReconcilingId(null); }
  };
  const totalRecorded = payments.filter((payment) => payment.status === "confirmed" || payment.status === "reconciled").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const confirmPayment = async (payment: PaymentRecord) => {
    setConfirmingId(payment.id); setActionError("");
    try { await api.post<InvoiceApiRow>(`/invoices/${payment.invoice_id}/payments/${payment.id}/confirm`); await load(); }
    catch (err) { setActionError(errorMessage(err)); }
    finally { setConfirmingId(null); }
  };
  return <BaseLayout>
    <div className="mx-auto flex w-full max-w-screen-2xl min-w-0 flex-col gap-6 px-4 sm:px-6 lg:px-8">
      <PageHeader title="Payments" description="Payment records stored against your company's invoices. Provider and bank verification are shown separately from ERP recording." action={<Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>} />
      {error && <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 p-4 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" /><span className="flex-1">{error}</span><Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button></div>}
      <section className="grid gap-4 sm:grid-cols-2">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardDescription>Recorded payments</CardDescription><Banknote className="size-5 text-muted-foreground" /></CardHeader><CardContent><CardTitle className="text-2xl tabular-nums">{loading ? "—" : payments.length}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Persisted invoice payment reports</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardDescription>Total confirmed</CardDescription><Receipt className="size-5 text-muted-foreground" /></CardHeader><CardContent><CardTitle className="text-2xl tabular-nums">{loading ? "—" : formatKES(totalRecorded)}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Confirmed ERP receipts; provider verification is separate</p></CardContent></Card>
      </section>
      {actionError && <div role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{actionError}</div>}
      <Card><CardHeader><CardTitle>Payment activity</CardTitle><CardDescription>{invoiceCount} invoice(s) checked. Pending reports do not update invoice balances or accounting until an authorized user confirms them. M-Pesa provider callbacks and bank statement reconciliation are not yet integrated.</CardDescription></CardHeader><CardContent>
        {loading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading payment records…</div> : error ? <div className="py-8 text-sm text-muted-foreground">Payment activity could not be loaded.</div> : payments.length === 0 ? <EmptyState icon={Banknote} title="No payment records yet" description="When a payment is recorded against an invoice, its persisted details will appear here. No sample transactions are shown." /> :
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Date recorded</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{payments.map((payment) => <TableRow key={payment.id}><TableCell className="font-medium">{payment.invoice_number}</TableCell><TableCell className="max-w-48 truncate">{payment.customer_name}</TableCell><TableCell>{formatDateTime(payment.status === "pending" ? payment.created_at : payment.paid_at || payment.created_at)}</TableCell><TableCell>{methodLabel[payment.method] ?? payment.method}</TableCell><TableCell className="max-w-40 truncate">{payment.reference || "—"}</TableCell><TableCell className="text-right font-medium tabular-nums">{formatKES(Number(payment.amount))}</TableCell><TableCell><span className="inline-flex rounded-full border px-2 py-1 text-xs capitalize">{payment.status.replaceAll("_", " ")}</span></TableCell><TableCell className="text-right">{payment.status === "pending" && canVerifyPayments ? <Button size="sm" variant="outline" disabled={confirmingId !== null || reconcilingId !== null} onClick={() => void confirmPayment(payment)}>{confirmingId === payment.id ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <CheckCircle2 className="mr-2 size-3.5" />}Confirm</Button> : payment.status === "confirmed" && canReconcilePayments ? <div className="flex min-w-56 items-center justify-end gap-2"><input aria-label="Bank statement reference" className="h-9 w-36 rounded-md border bg-background px-2 text-xs" placeholder="Statement ref" maxLength={120} value={statementReferences[payment.id] || ""} onChange={(event) => setStatementReferences((current) => ({ ...current, [payment.id]: event.target.value }))} /><Button size="sm" variant="outline" disabled={reconcilingId !== null || confirmingId !== null} onClick={() => void reconcilePayment(payment)}>{reconcilingId === payment.id ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}Reconcile</Button></div> : payment.status === "reconciled" ? <span className="text-xs text-muted-foreground">{payment.reconciliation_reference || "Reconciled"}{payment.reconciled_at ? ` · ${formatDateTime(payment.reconciled_at)}` : ""}</span> : payment.verified_at ? <span className="text-xs text-muted-foreground">Verified {formatDateTime(payment.verified_at)}</span> : payment.status === "pending" ? <span className="text-xs text-muted-foreground">Awaiting verification</span> : "—"}</TableCell></TableRow>)}</TableBody></Table></div>}
      </CardContent></Card>
      <p className="text-xs text-muted-foreground">Important: this page does not claim automatic M-Pesa verification, bank matching, or accountant reconciliation. Those require a dedicated payment-status model and provider/statement workflow before payments can be safely marked verified.</p>
    </div>
  </BaseLayout>;
}
