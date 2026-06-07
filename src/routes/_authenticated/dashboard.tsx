import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { qAccounts, qTransactions, qBudgets } from "@/lib/finance-queries";
import { money, shortMoney } from "@/lib/format";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Activity } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { format, startOfMonth, subMonths, isAfter, parseISO } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Vault" }] }),
  component: Dashboard,
});

function Dashboard() {
  const accounts = useQuery(qAccounts);
  const txns = useQuery(qTransactions);
  const budgets = useQuery(qBudgets);

  const accs = accounts.data ?? [];
  const tx = txns.data ?? [];
  const buds = budgets.data ?? [];

  const assets = accs.filter(a => !a.is_liability).reduce((s, a) => s + Number(a.balance), 0);
  const liabilities = accs.filter(a => a.is_liability).reduce((s, a) => s + Number(a.balance), 0);
  const netWorth = assets - liabilities;

  const monthStart = startOfMonth(new Date());
  const thisMonth = tx.filter(t => isAfter(parseISO(t.occurred_at), monthStart));
  const income = thisMonth.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const spend = thisMonth.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const savingsRate = income > 0 ? Math.max(0, ((income - spend) / income) * 100) : 0;

  // 6-month series
  const series = Array.from({ length: 6 }).map((_, i) => {
    const d = startOfMonth(subMonths(new Date(), 5 - i));
    const next = startOfMonth(subMonths(new Date(), 4 - i));
    const inMonth = tx.filter(t => {
      const dt = parseISO(t.occurred_at);
      return dt >= d && dt < next;
    });
    return {
      month: format(d, "MMM"),
      income: inMonth.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
      expense: inMonth.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
    };
  });

  // category breakdown this month
  const catTotals = new Map<string, number>();
  thisMonth.filter(t => t.type === "expense").forEach(t => {
    const key = t.category_id ?? "Uncategorized";
    catTotals.set(key, (catTotals.get(key) ?? 0) + Number(t.amount));
  });
  const pieData = Array.from(catTotals.entries()).map(([id, value]) => ({ name: id.slice(0, 4), value })).slice(0, 6);
  const pieColors = ["var(--color-chart-1)","var(--color-chart-2)","var(--color-chart-3)","var(--color-chart-4)","var(--color-chart-5)","oklch(0.6 0.1 200)"];

  // health score
  const health = Math.min(100, Math.round(savingsRate * 0.6 + (netWorth > 0 ? 30 : 0) + (liabilities < assets * 0.3 ? 10 : 0)));

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Overview</p>
          <h1 className="font-display text-3xl font-semibold">Good to see you.</h1>
        </div>
        <div className="hidden text-right md:block">
          <p className="text-xs text-muted-foreground">Financial health</p>
          <p className="font-tabular text-2xl font-semibold text-primary">{health}<span className="text-sm text-muted-foreground">/100</span></p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Stat label="Net worth" value={money(netWorth)} icon={Wallet} accent />
        <Stat label="Assets" value={money(assets)} icon={TrendingUp} tone="success" />
        <Stat label="Liabilities" value={money(liabilities)} icon={TrendingDown} tone="warn" />
        <Stat label="Savings rate" value={`${savingsRate.toFixed(1)}%`} icon={PiggyBank} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Cash flow</h2>
            <span className="text-xs text-muted-foreground">Last 6 months</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5}/>
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-5)" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="var(--color-chart-5)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={shortMoney} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} formatter={(v: number) => money(v)} />
                <Area type="monotone" dataKey="income" stroke="var(--color-chart-1)" fill="url(#gi)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" stroke="var(--color-chart-5)" fill="url(#ge)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">This month</h2>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            <Row label="Income" value={money(income)} tone="success" />
            <Row label="Spending" value={money(spend)} tone="warn" />
            <Row label="Net" value={money(income - spend)} bold />
            <div className="my-2 h-px bg-border" />
            <Row label="Budgets" value={`${buds.length} set`} />
            <Row label="Accounts" value={`${accs.length} linked`} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Spending by category</h2>
          {pieData.length === 0 ? <Empty label="No expenses this month yet" /> : (
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} formatter={(v: number) => money(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Income vs Expenses</h2>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={series}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={shortMoney} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} formatter={(v: number) => money(v)} />
                <Bar dataKey="income" fill="var(--color-chart-1)" radius={[6,6,0,0]} />
                <Bar dataKey="expense" fill="var(--color-chart-5)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, icon: Icon, accent, tone }: { label: string; value: string; icon: any; accent?: boolean; tone?: "success" | "warn" }) {
  return (
    <div className={"rounded-xl border border-border bg-card p-5 " + (accent ? "relative overflow-hidden" : "")} style={accent ? { backgroundImage: "var(--gradient-card)" } : undefined}>
      {accent && <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full" style={{ background: "var(--gradient-primary)", opacity: 0.15, filter: "blur(20px)" }} />}
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className={"h-4 w-4 " + (tone === "success" ? "text-primary" : tone === "warn" ? "text-warning" : "text-muted-foreground")} />
      </div>
      <p className="mt-2 font-tabular text-2xl font-semibold">{value}</p>
    </div>
  );
}
function Row({ label, value, tone, bold }: { label: string; value: string; tone?: "success" | "warn"; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={"font-tabular " + (bold ? "font-semibold " : "") + (tone === "success" ? "text-primary" : tone === "warn" ? "text-warning" : "")}>{value}</span>
    </div>
  );
}
function Empty({ label }: { label: string }) {
  return <div className="grid h-56 place-items-center text-sm text-muted-foreground">{label}</div>;
}
