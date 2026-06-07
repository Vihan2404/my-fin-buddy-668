import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { qBudgets, qCategories, qTransactions } from "@/lib/finance-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useMoney } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";
import { startOfMonth, isAfter, parseISO } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/budgets")({
  head: () => ({ meta: [{ title: "Budgets — Vault" }] }),
  component: BudgetsPage,
});

function BudgetsPage() {
  const { fmt: money } = useMoney();
  const budgets = useQuery(qBudgets);
  const categories = useQuery(qCategories);
  const txns = useQuery(qTransactions);
  const qc = useQueryClient();

  const catMap = new Map((categories.data ?? []).map(c => [c.id, c]));
  const monthStart = startOfMonth(new Date());
  const spendByCat = new Map<string, number>();
  (txns.data ?? []).filter(t => t.type === "expense" && isAfter(parseISO(t.occurred_at), monthStart)).forEach(t => {
    if (!t.category_id) return;
    spendByCat.set(t.category_id, (spendByCat.get(t.category_id) ?? 0) + Number(t.amount));
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("budgets").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["budgets"] }); toast.success("Removed"); },
  });

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Plan</p>
          <h1 className="font-display text-3xl font-semibold">Budgets</h1>
        </div>
        <NewBudgetDialog categories={(categories.data ?? []).filter(c => c.kind === "expense")} />
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {(budgets.data ?? []).map(b => {
          const cat = b.category_id ? catMap.get(b.category_id) : null;
          const spent = b.category_id ? (spendByCat.get(b.category_id) ?? 0) : 0;
          const pct = Math.min(100, (spent / Number(b.amount)) * 100);
          const over = spent > Number(b.amount);
          return (
            <div key={b.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{cat?.name ?? "Uncategorized"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{b.period}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => del.mutate(b.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="mt-4 flex items-baseline justify-between font-tabular">
                <span className={"text-2xl font-semibold " + (over ? "text-destructive" : "")}>{money(spent)}</span>
                <span className="text-sm text-muted-foreground">of {money(Number(b.amount))}</span>
              </div>
              <Progress value={pct} className="mt-3" />
              <p className={"mt-2 text-xs " + (over ? "text-destructive" : "text-muted-foreground")}>
                {over ? `Over by ${money(spent - Number(b.amount))}` : `${money(Number(b.amount) - spent)} remaining`}
              </p>
            </div>
          );
        })}
        {budgets.data?.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No budgets yet. Set monthly limits per category to stay on track.
          </div>
        )}
      </div>
    </div>
  );
}

function NewBudgetDialog({ categories }: { categories: any[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");

  const m = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("budgets").insert({ user_id: user!.id, category_id: categoryId, amount: parseFloat(amount), period: "monthly" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["budgets"] }); toast.success("Budget set"); setOpen(false); setAmount(""); setCategoryId(""); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />New budget</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Monthly budget</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); m.mutate(); }} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Amount per month</Label><Input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={m.isPending || !categoryId}>{m.isPending ? "Saving..." : "Save"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
