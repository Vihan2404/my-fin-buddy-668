import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { qAccounts, qTransactions, qBudgets, qGoals } from "@/lib/finance-queries";
import { useMoney, currencySymbol } from "@/lib/format";
import { getInsights, getAiBrief } from "@/lib/insights.functions";
import { getFxRates } from "@/lib/market.functions";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Sparkles, AlertTriangle, Target, ArrowUpRight, ArrowDownRight, Repeat } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { format, startOfMonth, subMonths, isAfter, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Vault" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { fmt: money, short: shortMoney, currency } = useMoney();
  const accounts = useQuery(qAccounts);
  const txns = useQuery(qTransactions);
  const budgets = useQuery(qBudgets);
  const goals = useQuery(qGoals);
  const insightsFn = useServerFn(getInsights);
  const briefFn = useServerFn(getAiBrief);
  const insights = useQuery({ queryKey: ["insights"], queryFn: () => insightsFn() });
  const brief = useQuery({ queryKey: ["aiBrief"], queryFn: () => briefFn(), staleTime: 1000 * 60 * 30 });

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

  const series = Array.from({ length: 6 }).map((_, i) => {
    const d = startOfMonth(subMonths(new Date(), 5 - i));
    const next = startOfMonth(subMonths(new Date(), 4 - i));
    const inMonth = tx.filter(t => { const dt = parseISO(t.occurred_at); return dt >= d && dt < next; });
    return {
      month: format(d, "MMM"),
      income: inMonth.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
      expense: inMonth.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
    };
  });

  const catTotals = (insights.data?.topCategories ?? []).map((c) => ({ name: c.name, value: c.amount }));
  const pieColors = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

  const health = Math.min(100, Math.round(savingsRate * 0.6 + (netWorth > 0 ? 30 : 0) + (liabilities < assets * 0.3 ? 10 : 0)));
  const monthDelta = insights.data?.monthDeltaPct ?? 0;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-border p-6 sm:p-8" style={{ backgroundImage: "var(--gradient-card)" }}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full" style={{ background: "var(--gradient-primary)", opacity: 0.18, filter: "blur(60px)" }} />
        <div className="pointer-events-none absolute -bottom-32 -left-10 h-72 w-72 rounded-full" style={{ background: "var(--gradient-primary)", opacity: 0.08, filter: "blur(60px)" }} />
        <div className="relative grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="text-sm uppercase tracking-wider text-muted-foreground">Your Net Worth</p>
            <p className="mt-2 font-tabular text-5xl font-bold sm:text-6xl">{money(netWorth)}</p>
            <p className="mt-3 text-base text-muted-foreground">
              {netWorth >= 0 ? "You're building wealth. Keep going." : "Liabilities exceed assets — let's turn this around."}
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
              <MiniStat label="Assets" value={shortMoney(assets)} tone="success" />
              <MiniStat label="Debts" value={shortMoney(liabilities)} tone="warn" />
              <MiniStat label="Health" value={`${health}/100`} />
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background/30 p-5 backdrop-blur">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-semibold">AI Briefing</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">
              {brief.isLoading ? "Reading your finances…" : brief.data?.brief || "Add some transactions and I'll give you a personalized briefing."}
            </p>
            <Link to="/assistant"><Button variant="outline" size="sm" className="mt-4 w-full gap-2"><Sparkles className="h-4 w-4" /> Ask the assistant</Button></Link>
          </div>
        </div>
      </section>

      {/* KPI ROW */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Income (month)" value={money(income)} icon={ArrowDownRight} tone="success" />
        <Stat label="Spending (month)" value={money(spend)} icon={ArrowUpRight} tone="warn" delta={monthDelta} />
        <Stat label="Savings rate" value={`${savingsRate.toFixed(1)}%`} icon={PiggyBank} />
        <Stat label="Active goals" value={`${(goals.data ?? []).length}`} icon={Target} hint="View your goals" linkTo="/goals" />
      </section>

      {/* ALERTS + INSIGHTS */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h2 className="font-display text-lg font-semibold">Spending alerts</h2>
          </div>
          {(insights.data?.anomalies ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No unusual spending detected. You're on track.</p>
          ) : (
            <ul className="space-y-3">
              {insights.data!.anomalies.map((a) => (
                <li key={a.category} className="flex items-center justify-between rounded-xl border border-warning/30 bg-warning/5 p-4">
                  <div>
                    <div className="font-medium">{a.category}</div>
                    <div className="text-xs text-muted-foreground">Avg {money(a.avg)} → {money(a.thisMonth)} this month</div>
                  </div>
                  <div className="font-tabular text-lg font-semibold text-warning">+{a.deltaPct.toFixed(0)}%</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <CurrencyConverter baseCurrency={currency} />
      </section>

      {/* CHARTS */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Cash flow</h2>
            <span className="text-xs text-muted-foreground">Last 6 months</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-chart-5)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--color-chart-5)" stopOpacity={0} /></linearGradient>
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
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Top spending categories</h2>
          {catTotals.length === 0 ? <Empty label="No expenses yet" /> : (
            <>
              <div className="h-44">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={catTotals} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {catTotals.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} formatter={(v: number) => money(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {catTotals.map((c, i) => (
                  <li key={c.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: pieColors[i % pieColors.length] }} />{c.name}</span>
                    <span className="font-tabular text-muted-foreground">{money(c.value)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* TOP MERCHANTS + CASH FLOW BAR */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Top merchants this month</h2>
          {(insights.data?.topMerchants ?? []).length === 0 ? <Empty label="No data yet" /> : (
            <ul className="space-y-3">
              {insights.data!.topMerchants.map((m, i) => {
                const maxAmt = insights.data!.topMerchants[0].amount;
                const pct = (m.amount / maxAmt) * 100;
                return (
                  <li key={m.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{i + 1}. {m.name}</span>
                      <span className="font-tabular text-muted-foreground">{money(m.amount)}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--gradient-primary)" }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Income vs Expenses</h2>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={series}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={shortMoney} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} formatter={(v: number) => money(v)} />
                <Bar dataKey="income" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" fill="var(--color-chart-5)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "success" | "warn" }) {
  return (
    <div className="rounded-xl border border-border bg-background/30 p-3 backdrop-blur">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={"mt-1 font-tabular text-lg font-semibold " + (tone === "success" ? "text-primary" : tone === "warn" ? "text-warning" : "")}>{value}</p>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone, delta, hint, linkTo }: { label: string; value: string; icon: any; tone?: "success" | "warn"; delta?: number; hint?: string; linkTo?: string }) {
  const content = (
    <div className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className={"h-5 w-5 " + (tone === "success" ? "text-primary" : tone === "warn" ? "text-warning" : "text-muted-foreground")} />
      </div>
      <p className="mt-2 font-tabular text-2xl font-bold">{value}</p>
      {typeof delta === "number" && Math.abs(delta) > 0.5 && (
        <p className={"mt-1 text-xs " + (delta > 0 ? "text-warning" : "text-primary")}>{delta > 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(0)}% vs last month</p>
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  return linkTo ? <Link to={linkTo}>{content}</Link> : content;
}

function Empty({ label }: { label: string }) {
  return <div className="grid h-56 place-items-center text-sm text-muted-foreground">{label}</div>;
}

function CurrencyConverter({ baseCurrency }: { baseCurrency: string }) {
  const fxFn = useServerFn(getFxRates);
  const rates = useQuery({ queryKey: ["fx"], queryFn: () => fxFn(), staleTime: 1000 * 60 * 30 });
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState(baseCurrency);
  const [to, setTo] = useState("EUR");
  useEffect(() => { setFrom(baseCurrency); }, [baseCurrency]);

  const currencies = ["USD", "EUR", "GBP", "INR", "JPY", "CAD", "AUD", "CHF", "CNY", "SGD", "AED", "BRL", "ZAR"];
  const r = rates.data?.rates ?? {};
  const fromRate = from === "USD" ? 1 : r[from];
  const toRate = to === "USD" ? 1 : r[to];
  const converted = fromRate && toRate ? (parseFloat(amount || "0") / fromRate) * toRate : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Repeat className="h-5 w-5 text-primary" />
        <h2 className="font-display text-lg font-semibold">Currency converter</h2>
      </div>
      <div className="space-y-3">
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Amount" />
        <div className="grid grid-cols-2 gap-2">
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            {currencies.map(c => <option key={c} value={c}>{c} {currencySymbol(c)}</option>)}
          </select>
          <select value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            {currencies.map(c => <option key={c} value={c}>{c} {currencySymbol(c)}</option>)}
          </select>
        </div>
        <div className="rounded-xl border border-border bg-background/40 p-4 text-center">
          <p className="text-xs text-muted-foreground">{amount || "0"} {from} =</p>
          <p className="mt-1 font-tabular text-2xl font-bold text-primary">{converted == null ? "…" : `${converted.toFixed(2)} ${to}`}</p>
        </div>
      </div>
    </div>
  );
}
