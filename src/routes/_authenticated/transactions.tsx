import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { qTransactions, qAccounts, qCategories } from "@/lib/finance-queries";
import { useServerFn } from "@tanstack/react-start";
import { aiCategorize } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { money } from "@/lib/format";
import { Plus, Sparkles, Trash2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({ meta: [{ title: "Transactions — Vault" }] }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const txns = useQuery(qTransactions);
  const accounts = useQuery(qAccounts);
  const categories = useQuery(qCategories);
  const qc = useQueryClient();

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transactions"] }); toast.success("Deleted"); },
  });

  const accMap = new Map((accounts.data ?? []).map(a => [a.id, a.name]));
  const catMap = new Map((categories.data ?? []).map(c => [c.id, c]));

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Ledger</p>
          <h1 className="font-display text-3xl font-semibold">Transactions</h1>
        </div>
        <NewTransactionDialog accounts={accounts.data ?? []} categories={categories.data ?? []} />
      </header>

      <div className="rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(txns.data ?? []).map(t => {
              const cat = t.category_id ? catMap.get(t.category_id) : null;
              const isIncome = t.type === "income";
              return (
                <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-accent/30">
                  <td className="px-4 py-3 text-muted-foreground">{format(parseISO(t.occurred_at), "MMM d")}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={"grid h-7 w-7 place-items-center rounded-full " + (isIncome ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
                        {isIncome ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                      </span>
                      <div>
                        <div>{t.description || t.merchant || "—"}</div>
                        {t.merchant && t.description && <div className="text-xs text-muted-foreground">{t.merchant}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{cat?.name ?? <span className="italic opacity-60">Uncategorized</span>}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.account_id ? accMap.get(t.account_id) : "—"}</td>
                  <td className={"px-4 py-3 text-right font-tabular font-medium " + (isIncome ? "text-primary" : "")}>{isIncome ? "+" : "−"}{money(Math.abs(Number(t.amount)), t.currency)}</td>
                  <td className="px-2 py-3"><Button variant="ghost" size="icon" onClick={() => del.mutate(t.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button></td>
                </tr>
              );
            })}
            {txns.data?.length === 0 && (
              <tr><td colSpan={6} className="p-10 text-center text-sm text-muted-foreground">No transactions yet. Add your first one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewTransactionDialog({ accounts, categories }: { accounts: any[]; categories: any[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const categorize = useServerFn(aiCategorize);
  const [aiLoading, setAiLoading] = useState(false);

  const filteredCats = categories.filter(c => c.kind === type);

  const suggest = async () => {
    if (!description || !amount) return toast.error("Add a description and amount first");
    if (filteredCats.length === 0) return toast.error("Create some categories first");
    setAiLoading(true);
    const { category } = await categorize({ data: { description, amount: parseFloat(amount), categories: filteredCats.map(c => c.name) } });
    setAiLoading(false);
    if (!category) return toast.error("AI couldn't suggest a category");
    const match = filteredCats.find(c => c.name === category);
    if (match) { setCategoryId(match.id); toast.success(`Suggested: ${category}`); }
  };

  const add = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("transactions").insert({
        user_id: user!.id,
        type, amount: parseFloat(amount),
        description: description || null,
        account_id: accountId || null,
        category_id: categoryId || null,
        occurred_at: new Date(date).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Transaction added");
      setOpen(false); setAmount(""); setDescription(""); setCategoryId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Add transaction</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New transaction</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v: any) => { setType(v); setCategoryId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Amount</Label><Input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Whole Foods grocery run" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center justify-between">Category
                <button type="button" onClick={suggest} disabled={aiLoading} className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50">
                  <Sparkles className="h-3 w-3" />{aiLoading ? "..." : "AI suggest"}
                </button>
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{filteredCats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={add.isPending}>{add.isPending ? "Saving..." : "Save"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
