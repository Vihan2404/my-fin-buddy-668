import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { qAccounts, qTransactions, qCategories, qInvestments, qBudgets, qBills } from "@/lib/finance-queries";
import { useMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, FileJson, FileDown, Download } from "lucide-react";
import { downloadPDF, downloadExcel, downloadJSON, downloadCSV } from "@/lib/exports";
import { format, parseISO, startOfMonth, isAfter } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — Vault" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { fmt, currency } = useMoney();
  const accounts = useQuery(qAccounts);
  const txns = useQuery(qTransactions);
  const cats = useQuery(qCategories);
  const invs = useQuery(qInvestments);
  const buds = useQuery(qBudgets);
  const bills = useQuery(qBills);

  const accs = accounts.data ?? [];
  const tx = txns.data ?? [];
  const catMap = new Map((cats.data ?? []).map((c) => [c.id, c.name]));
  const accMap = new Map(accs.map((a) => [a.id, a.name]));

  const monthStart = startOfMonth(new Date());
  const monthTx = tx.filter((t) => isAfter(parseISO(t.occurred_at), monthStart));
  const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const spend = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const assets = accs.filter((a) => !a.is_liability).reduce((s, a) => s + Number(a.balance), 0);
  const liabilities = accs.filter((a) => a.is_liability).reduce((s, a) => s + Number(a.balance), 0);

  const txRows = tx.map((t) => ({
    Date: format(parseISO(t.occurred_at), "yyyy-MM-dd"),
    Description: t.description ?? "",
    Merchant: t.merchant ?? "",
    Category: t.category_id ? catMap.get(t.category_id) ?? "" : "",
    Account: t.account_id ? accMap.get(t.account_id) ?? "" : "",
    Type: t.type,
    Amount: Number(t.amount),
    Currency: t.currency,
  }));
  const accRows = accs.map((a) => ({ Name: a.name, Type: a.type, Institution: a.institution ?? "", Balance: Number(a.balance), Currency: a.currency, IsLiability: a.is_liability }));
  const invRows = (invs.data ?? []).map((i) => ({
    Symbol: i.symbol, Name: i.name ?? "", AssetClass: i.asset_class,
    Quantity: Number(i.quantity), AvgCost: Number(i.avg_cost), CurrentPrice: Number(i.current_price),
    MarketValue: Number(i.quantity) * Number(i.current_price),
    PnL: Number(i.quantity) * (Number(i.current_price) - Number(i.avg_cost)),
  }));

  const summary = [
    { label: "Period", value: `${format(monthStart, "MMMM yyyy")}` },
    { label: "Currency", value: currency },
    { label: "Net worth", value: fmt(assets - liabilities) },
    { label: "Assets", value: fmt(assets) },
    { label: "Liabilities", value: fmt(liabilities) },
    { label: "Income this month", value: fmt(income) },
    { label: "Spending this month", value: fmt(spend) },
    { label: "Net this month", value: fmt(income - spend) },
  ];

  const exportPDF = () => {
    downloadPDF(`vault-financial-report-${format(new Date(), "yyyy-MM-dd")}`, {
      title: "Financial Report",
      subtitle: `Generated ${format(new Date(), "PPP")} · ${monthTx.length} transactions this month`,
      summary,
      tables: [
        { heading: "Accounts", columns: ["Name", "Type", "Balance", "Currency"], rows: accs.map((a) => [a.name, a.type, fmt(Number(a.balance)), a.currency]) },
        { heading: "Recent Transactions (latest 50)", columns: ["Date", "Description", "Category", "Type", "Amount"], rows: tx.slice(0, 50).map((t) => [format(parseISO(t.occurred_at), "yyyy-MM-dd"), (t.description ?? t.merchant ?? "—").slice(0, 40), t.category_id ? catMap.get(t.category_id) ?? "—" : "—", t.type, fmt(Number(t.amount))]) },
        ...(invRows.length ? [{ heading: "Investments", columns: ["Symbol", "Class", "Qty", "Cost", "Price", "Value", "P&L"], rows: invRows.map((i) => [i.Symbol, i.AssetClass, i.Quantity, fmt(i.AvgCost), fmt(i.CurrentPrice), fmt(i.MarketValue), fmt(i.PnL)]) }] : []),
      ],
    });
    toast.success("PDF downloaded");
  };

  const exportExcel = () => {
    downloadExcel(`vault-report-${format(new Date(), "yyyy-MM-dd")}`, {
      Summary: summary.map((s) => ({ Metric: s.label, Value: s.value })),
      Transactions: txRows,
      Accounts: accRows,
      Investments: invRows,
      Budgets: (buds.data ?? []).map((b) => ({ Category: b.category_id ? catMap.get(b.category_id) ?? "" : "All", Amount: Number(b.amount), Period: b.period })),
      Bills: (bills.data ?? []).map((b) => ({ Name: b.name, Amount: Number(b.amount), DueDate: b.due_date, Recurrence: b.recurrence, Paid: b.is_paid })),
    });
    toast.success("Excel downloaded");
  };

  const exportJSON = () => {
    downloadJSON(`vault-data-${format(new Date(), "yyyy-MM-dd")}`, {
      generated_at: new Date().toISOString(),
      currency, summary,
      accounts: accs, transactions: tx, categories: cats.data, investments: invs.data, budgets: buds.data, bills: bills.data,
    });
    toast.success("JSON downloaded");
  };

  const exportCSV = () => {
    downloadCSV(`vault-transactions-${format(new Date(), "yyyy-MM-dd")}`, txRows);
    toast.success("CSV downloaded");
  };

  return (
    <div className="space-y-6 p-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Export</p>
        <h1 className="font-display text-3xl font-semibold">Reports</h1>
        <p className="mt-1 text-base text-muted-foreground">Download your financial data in any format you need.</p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold">This month at a glance</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summary.slice(2).map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="mt-1 font-tabular text-xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ExportCard
          icon={FileText}
          title="PDF Report"
          desc="Polished printable summary with accounts, transactions and holdings."
          cta="Download PDF"
          onClick={exportPDF}
          color="oklch(0.7 0.18 25)"
        />
        <ExportCard
          icon={FileSpreadsheet}
          title="Excel Workbook"
          desc="Multi-sheet .xlsx — Summary, Transactions, Accounts, Investments, Bills."
          cta="Download Excel"
          onClick={exportExcel}
          color="oklch(0.78 0.16 150)"
        />
        <ExportCard
          icon={FileJson}
          title="JSON Backup"
          desc="Full machine-readable backup of all your Vault data."
          cta="Download JSON"
          onClick={exportJSON}
          color="oklch(0.72 0.15 230)"
        />
        <ExportCard
          icon={FileDown}
          title="CSV Transactions"
          desc="Plain CSV of every transaction — opens in any spreadsheet."
          cta="Download CSV"
          onClick={exportCSV}
          color="oklch(0.82 0.15 78)"
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold">Need a quick export?</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">All your data stays private. Files are generated in your browser and never sent to a server.</p>
      </section>
    </div>
  );
}

function ExportCard({ icon: Icon, title, desc, cta, onClick, color }: { icon: any; title: string; desc: string; cta: string; onClick: () => void; color: string }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-6 transition hover:border-primary/40">
      <div className="grid h-12 w-12 place-items-center rounded-xl" style={{ backgroundColor: color }}>
        <Icon className="h-6 w-6 text-background" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{desc}</p>
      <Button size="lg" className="mt-4 w-full gap-2" onClick={onClick}><Download className="h-4 w-4" />{cta}</Button>
    </div>
  );
}
