import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { qAccounts, qInvestments } from "@/lib/finance-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { money } from "@/lib/format";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/networth")({
  head: () => ({ meta: [{ title: "Net worth — Vault" }] }),
  component: NetWorthPage,
});

function NetWorthPage() {
  const accounts = useQuery(qAccounts);
  const investments = useQuery(qInvestments);
  const qc = useQueryClient();

  const accs = accounts.data ?? [];
  const invs = investments.data ?? [];

  const assetAccs = accs.filter(a => !a.is_liability);
  const liabAccs = accs.filter(a => a.is_liability);
  const investmentsValue = invs.reduce((s, i) => s + Number(i.quantity) * Number(i.current_price), 0);
  const investmentsCost = invs.reduce((s, i) => s + Number(i.quantity) * Number(i.avg_cost), 0);
  const totalAssets = assetAccs.reduce((s, a) => s + Number(a.balance), 0);
  const totalLiabilities = liabAccs.reduce((s, a) => s + Number(a.balance), 0);
  const netWorth = totalAssets - totalLiabilities;
  const invPnL = investmentsValue - investmentsCost;

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("investments").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["investments"] }); toast.success("Removed"); },
  });

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Wealth</p>
          <h1 className="font-display text-3xl font-semibold">Net worth</h1>
        </div>
        <NewInvestmentDialog accounts={accs.filter(a => a.type === "investment")} />
      </header>

      <div className="relative overflow-hidden rounded-xl border border-border p-6" style={{ backgroundImage: "var(--gradient-card)" }}>
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full" style={{ background: "var(--gradient-primary)", opacity: 0.15, filter: "blur(40px)" }} />
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Total net worth</p>
        <p className="mt-2 font-tabular text-5xl font-semibold">{money(netWorth)}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Box label="Assets" value={money(totalAssets)} icon={TrendingUp} tone="success" />
          <Box label="Liabilities" value={money(totalLiabilities)} icon={TrendingDown} tone="warn" />
          <Box label="Investments" value={money(investmentsValue)} sub={`${invPnL >= 0 ? "+" : ""}${money(invPnL)} P&L`} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <List title="Assets" items={assetAccs.map(a => ({ id: a.id, name: a.name, sub: a.type, value: money(Number(a.balance), a.currency) }))} />
        <List title="Liabilities" items={liabAccs.map(a => ({ id: a.id, name: a.name, sub: a.type, value: money(Number(a.balance), a.currency), warn: true }))} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Investment portfolio</h2>
        {invs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No holdings yet. Track your stocks and mutual funds.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-3 py-2">Symbol</th><th className="px-3 py-2">Class</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Avg cost</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Value</th><th className="px-3 py-2 text-right">P&L</th><th /></tr>
            </thead>
            <tbody>
              {invs.map(i => {
                const value = Number(i.quantity) * Number(i.current_price);
                const pnl = value - Number(i.quantity) * Number(i.avg_cost);
                return (
                  <tr key={i.id} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2 font-medium">{i.symbol}<div className="text-xs text-muted-foreground">{i.name}</div></td>
                    <td className="px-3 py-2 capitalize text-muted-foreground">{i.asset_class}</td>
                    <td className="px-3 py-2 text-right font-tabular">{i.quantity}</td>
                    <td className="px-3 py-2 text-right font-tabular">{money(Number(i.avg_cost))}</td>
                    <td className="px-3 py-2 text-right font-tabular">{money(Number(i.current_price))}</td>
                    <td className="px-3 py-2 text-right font-tabular font-semibold">{money(value)}</td>
                    <td className={"px-3 py-2 text-right font-tabular " + (pnl >= 0 ? "text-primary" : "text-destructive")}>{pnl >= 0 ? "+" : ""}{money(pnl)}</td>
                    <td className="px-2 py-2"><Button variant="ghost" size="icon" onClick={() => del.mutate(i.id)}><Trash2 className="h-4 w-4" /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Box({ label, value, sub, icon: Icon, tone }: { label: string; value: string; sub?: string; icon?: any; tone?: "success" | "warn" }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {Icon && <Icon className={"h-4 w-4 " + (tone === "success" ? "text-primary" : tone === "warn" ? "text-warning" : "")} />}
      </div>
      <p className="mt-1 font-tabular text-xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function List({ title, items }: { title: string; items: { id: string; name: string; sub: string; value: string; warn?: boolean }[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 font-display text-lg font-semibold">{title}</h2>
      <div className="space-y-2">
        {items.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Nothing here.</p>}
        {items.map(i => (
          <div key={i.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
            <div><p className="text-sm font-medium">{i.name}</p><p className="text-xs capitalize text-muted-foreground">{i.sub.replace("_"," ")}</p></div>
            <p className={"font-tabular font-medium " + (i.warn ? "text-warning" : "")}>{i.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewInvestmentDialog({ accounts }: { accounts: any[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [assetClass, setAssetClass] = useState("stock");
  const [quantity, setQuantity] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [accountId, setAccountId] = useState("");

  const m = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("investments").insert({
        user_id: user!.id, symbol: symbol.toUpperCase(), name: name || null, asset_class: assetClass,
        quantity: parseFloat(quantity), avg_cost: parseFloat(avgCost), current_price: parseFloat(currentPrice || avgCost),
        account_id: accountId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["investments"] }); toast.success("Added"); setOpen(false); setSymbol(""); setName(""); setQuantity(""); setAvgCost(""); setCurrentPrice(""); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Add holding</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New investment holding</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); m.mutate(); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Symbol</Label><Input required value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="AAPL" /></div>
            <div className="space-y-1.5"><Label>Asset class</Label>
              <select value={assetClass} onChange={e => setAssetClass(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="stock">Stock</option>
                <option value="mutual_fund">Mutual fund</option>
                <option value="sip">SIP (Systematic Investment Plan)</option>
                <option value="etf">ETF</option>
                <option value="index_fund">Index fund</option>
                <option value="crypto">Crypto</option>
                <option value="bond">Bond</option>
                <option value="fd">Fixed deposit</option>
                <option value="ppf">PPF / Provident fund</option>
                <option value="nps">NPS / Pension</option>
                <option value="reit">REIT</option>
                <option value="real_estate">Real estate</option>
                <option value="gold">Gold / Precious metal</option>
                <option value="commodity">Commodity</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Apple Inc." /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" step="0.0001" required value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Avg cost</Label><Input type="number" step="0.01" required value={avgCost} onChange={e => setAvgCost(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Current price</Label><Input type="number" step="0.01" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} /></div>
          </div>
          <Button type="submit" className="w-full" disabled={m.isPending}>{m.isPending ? "Saving..." : "Save"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
