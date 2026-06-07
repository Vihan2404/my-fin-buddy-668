import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { qAccounts, qCategories } from "@/lib/finance-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { money, useCurrency } from "@/lib/format";
import { Plus, Landmark, CreditCard, Banknote, TrendingUp, Building2, Coins, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({ meta: [{ title: "Accounts — Vault" }] }),
  component: AccountsPage,
});

const TYPE_META: Record<string, { label: string; icon: any }> = {
  bank: { label: "Bank", icon: Landmark },
  credit_card: { label: "Credit card", icon: CreditCard },
  cash: { label: "Cash", icon: Banknote },
  investment: { label: "Investment", icon: TrendingUp },
  loan: { label: "Loan", icon: Building2 },
  asset: { label: "Asset", icon: Coins },
};

function AccountsPage() {
  const accounts = useQuery(qAccounts);
  const categories = useQuery(qCategories);
  const qc = useQueryClient();

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("accounts").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); toast.success("Removed"); },
  });

  const hasCats = (categories.data ?? []).length > 0;

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Wealth</p>
          <h1 className="font-display text-3xl font-semibold">Accounts</h1>
        </div>
        <div className="flex gap-2">
          {!hasCats && <SeedCategoriesButton />}
          <NewAccountDialog />
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(accounts.data ?? []).map(a => {
          const meta = TYPE_META[a.type] ?? TYPE_META.bank;
          const Icon = meta.icon;
          return (
            <div key={a.id} className="group relative rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.institution || meta.label}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={() => del.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <p className={"mt-6 font-tabular text-2xl font-semibold " + (a.is_liability ? "text-warning" : "")}>
                {a.is_liability ? "−" : ""}{money(Number(a.balance), a.currency)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{meta.label}{a.is_liability && " · Liability"}</p>
            </div>
          );
        })}
        {accounts.data?.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No accounts yet. Add a bank, credit card, cash wallet, or asset to start tracking your net worth.
          </div>
        )}
      </div>
    </div>
  );
}

function NewAccountDialog() {
  const qc = useQueryClient();
  const userCurrency = useCurrency();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [institution, setInstitution] = useState("");
  const [balance, setBalance] = useState("0");
  const [currency, setCurrency] = useState(userCurrency);
  const [isLiability, setIsLiability] = useState(false);

  const m = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("accounts").insert({
        user_id: user!.id, name, type: type as any, institution: institution || null,
        balance: parseFloat(balance), currency, is_liability: isLiability || type === "credit_card" || type === "loan",
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); toast.success("Account added"); setOpen(false); setName(""); setBalance("0"); setInstitution(""); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Add account</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New account</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); m.mutate(); }} className="space-y-3">
          <div className="space-y-1.5"><Label>Name</Label><Input required value={name} onChange={e => setName(e.target.value)} placeholder="Chase Checking" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Institution</Label><Input value={institution} onChange={e => setInstitution(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Balance</Label><Input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["USD","EUR","GBP","INR","JPY","CAD","AUD"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div><Label className="text-sm">Liability</Label><p className="text-xs text-muted-foreground">Treat balance as debt</p></div>
            <Switch checked={isLiability} onCheckedChange={setIsLiability} />
          </div>
          <Button type="submit" className="w-full" disabled={m.isPending}>{m.isPending ? "Saving..." : "Save"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SeedCategoriesButton() {
  const qc = useQueryClient();
  const seed = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const expense = ["Food & Dining","Groceries","Transport","Housing","Utilities","Entertainment","Shopping","Health","Travel","Subscriptions","Other"];
      const income = ["Salary","Freelance","Investment","Gifts","Other Income"];
      const rows = [
        ...expense.map(name => ({ user_id: user!.id, name, kind: "expense" as const })),
        ...income.map(name => ({ user_id: user!.id, name, kind: "income" as const })),
      ];
      const { error } = await supabase.from("categories").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Default categories created"); },
    onError: (e: any) => toast.error(e.message),
  });
  return <Button variant="outline" onClick={() => seed.mutate()}>Seed categories</Button>;
}
