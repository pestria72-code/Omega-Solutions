import * as React from "react";
import { AlertCircle, Banknote, Loader2, RefreshCw, Receipt } from "lucide-react";
import { BaseLayout } from "@/components/layouts/base-layout";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api-client";
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
  const [payments, setPayments] = React.useState<PaymentRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [invoiceCount, setInvoiceCount] = React.useState(0);

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

  const totalRecorded = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  return <BaseLayout>
    <div className="mx-auto flex w-full max-w-screen-2xl min-w-0 flex-col gap-6 px-4 sm:px-6 lg:px-8">
      <PageHeader title="Payments" description="Payment records stored against your company's invoices. Provider and bank verification are shown separately from ERP recording." action={<Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>} />
      {error && <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 p-4 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" /><span className="flex-1">{error}</span><Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button></div>}
      <section className="grid gap-4 sm:grid-cols-2">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardDescription>Recorded payments</CardDescription><Banknote className="size-5 text-muted-foreground" /></CardHeader><CardContent><CardTitle className="text-2xl tabular-nums">{loading ? "—" : payments.length}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Persisted invoice payment entries</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardDescription>Total recorded</CardDescription><Receipt className="size-5 text-muted-foreground" /></CardHeader><CardContent><CardTitle className="text-2xl tabular-nums">{loading ? "—" : formatKES(totalRecorded)}</CardTitle><p className="mt-1 text-sm text-muted-foreground">ERP record total; not independently provider-verified</p></CardContent></Card>
      </section>
      <Card><CardHeader><CardTitle>Payment activity</CardTitle><CardDescription>{invoiceCount} invoice(s) checked. A recorded payment is not proof of M-Pesa or bank settlement; verification and reconciliation integrations are not yet enabled.</CardDescription></CardHeader><CardContent>
        {loading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading payment records…</div> : error ? <div className="py-8 text-sm text-muted-foreground">Payment activity could not be loaded.</div> : payments.length === 0 ? <EmptyState icon={Banknote} title="No payment records yet" description="When a payment is recorded against an invoice, its persisted details will appear here. No sample transactions are shown." /> :
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Date recorded</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{payments.map((payment) => <TableRow key={payment.id}><TableCell className="font-medium">{payment.invoice_number}</TableCell><TableCell className="max-w-48 truncate">{payment.customer_name}</TableCell><TableCell>{formatDateTime(payment.paid_at || payment.created_at)}</TableCell><TableCell>{methodLabel[payment.method] ?? payment.method}</TableCell><TableCell className="max-w-40 truncate">{payment.reference || "—"}</TableCell><TableCell className="text-right font-medium tabular-nums">{formatKES(Number(payment.amount))}</TableCell><TableCell><span className="inline-flex rounded-full border px-2 py-1 text-xs">Recorded · unverified</span></TableCell></TableRow>)}</TableBody></Table></div>}
      </CardContent></Card>
      <p className="text-xs text-muted-foreground">Important: this page does not claim automatic M-Pesa verification, bank matching, or accountant reconciliation. Those require a dedicated payment-status model and provider/statement workflow before payments can be safely marked verified.</p>
    </div>
  </BaseLayout>;
}
