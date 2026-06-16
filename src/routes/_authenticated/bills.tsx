import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { qBills } from "@/lib/finance-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMoney } from "@/lib/format";
import { Plus, Bell, Check, Trash2 } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bills")({
  head: () => ({
    meta: [
      { title: "Bills — Vault" },
      { name: "description", content: "Schedule recurring bill reminders and never miss a due date." },
      { property: "og:title", content: "Bills — Vault" },
      { property: "og:description", content: "Recurring bill reminders." },
      { property: "og:url", content: "https://wealthtrackpro.lovable.app/bills" },
    ],
    links: [{ rel: "canonical", href: "https://wealthtrackpro.lovable.app/bills" }],
  }),
  component: BillsPage,
});

function BillsPage() {
  const { fmt: money } = useMoney();
  const bills = useQuery(qBills);
  const qc = useQueryClient();

  const togglePaid = useMutation({
    mutationFn: async ({ id, is_paid }: { id: string; is_paid: boolean }) => {
      const { error } = await supabase.from("bills").update({ is_paid }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bills"] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("bills").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bills"] }); toast.success("Removed"); },
  });

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Reminders</p>
          <h1 className="font-display text-3xl font-semibold">Bills</h1>
        </div>
        <NewBillDialog />
      </header>

      <div className="grid gap-3">
        {(bills.data ?? []).map(b => {
          const days = differenceInDays(parseISO(b.due_date), new Date());
          const overdue = days < 0 && !b.is_paid;
          return (
            <div key={b.id} className={"flex items-center justify-between rounded-xl border bg-card p-4 " + (overdue ? "border-destructive/50" : "border-border")}>
              <div className="flex items-center gap-3">
                <div className={"grid h-10 w-10 place-items-center rounded-lg " + (b.is_paid ? "bg-primary/10 text-primary" : overdue ? "bg-destructive/10 text-destructive" : "bg-accent")}>
                  {b.is_paid ? <Check className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Due {format(parseISO(b.due_date), "MMM d")} ·{" "}
                    <span className={overdue ? "text-destructive" : ""}>{b.is_paid ? "Paid" : overdue ? `${Math.abs(days)}d overdue` : `in ${days}d`}</span> · {b.recurrence}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-tabular text-lg font-semibold">{money(Number(b.amount))}</span>
                <Button size="sm" variant={b.is_paid ? "outline" : "default"} onClick={() => togglePaid.mutate({ id: b.id, is_paid: !b.is_paid })}>{b.is_paid ? "Mark unpaid" : "Mark paid"}</Button>
                <Button variant="ghost" size="icon" aria-label="Delete bill" onClick={() => del.mutate(b.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          );
        })}
        {bills.data?.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No bills tracked yet.</div>
        )}
      </div>
    </div>
  );
}

function NewBillDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [recurrence, setRecurrence] = useState("monthly");

  const m = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("bills").insert({ user_id: user!.id, name, amount: parseFloat(amount), due_date: dueDate, recurrence: recurrence as any });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bills"] }); toast.success("Bill added"); setOpen(false); setName(""); setAmount(""); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />New bill</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New bill reminder</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); m.mutate(); }} className="space-y-3">
          <div className="space-y-1.5"><Label>Name</Label><Input required value={name} onChange={e => setName(e.target.value)} placeholder="Netflix" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Amount</Label><Input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Due date</Label><Input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Recurrence</Label>
            <select value={recurrence} onChange={e => setRecurrence(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="none">One-time</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option>
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={m.isPending}>{m.isPending ? "Saving..." : "Save"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
