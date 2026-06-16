import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { qGoals } from "@/lib/finance-queries";
import { useMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Target, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({
    meta: [
      { title: "Goals — Vault" },
      { name: "description", content: "Create savings goals, track progress and stay on pace with deadline countdowns." },
      { property: "og:title", content: "Goals — Vault" },
      { property: "og:description", content: "Savings goals and progress tracker." },
      { property: "og:url", content: "https://wealthtrackpro.lovable.app/goals" },
    ],
    links: [{ rel: "canonical", href: "https://wealthtrackpro.lovable.app/goals" }],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const { fmt } = useMoney();
  const goals = useQuery(qGoals);
  const qc = useQueryClient();

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("goals").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); toast.success("Goal removed"); },
  });

  const contribute = useMutation({
    mutationFn: async ({ id, amount, current }: { id: string; amount: number; current: number }) => {
      const { error } = await supabase.from("goals").update({ current_amount: current + amount }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); toast.success("Saved!"); },
  });

  const list = goals.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Savings</p>
          <h1 className="truncate font-display text-3xl font-semibold">My Goals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Set savings targets and track your progress.</p>
        </div>
        <NewGoalDialog />
      </header>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Target className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 font-display text-lg font-semibold">No goals yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Create your first savings goal to start tracking progress.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((g) => {
            const pct = g.target_amount > 0 ? Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100) : 0;
            const remaining = Math.max(0, Number(g.target_amount) - Number(g.current_amount));
            const days = g.deadline ? differenceInDays(parseISO(g.deadline), new Date()) : null;
            const done = pct >= 100;
            return (
              <div key={g.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {done ? <Trophy className="h-5 w-5 text-warning" /> : <Target className="h-5 w-5 text-primary" />}
                      <h3 className="font-display text-lg font-semibold">{g.name}</h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {fmt(Number(g.current_amount))} of {fmt(Number(g.target_amount))}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(g.id)} aria-label="Delete goal"><Trash2 className="h-4 w-4" /></Button>
                </div>
                <Progress value={pct} className="mt-4 h-3" />
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{pct.toFixed(0)}% complete</span>
                  {g.deadline && (
                    <span>{days! >= 0 ? `${days} days left` : `${-days!} days overdue`} · {format(parseISO(g.deadline), "MMM d, yyyy")}</span>
                  )}
                </div>
                {!done && (
                  <div className="mt-4 flex gap-2">
                    <ContributeForm onSubmit={(amount) => contribute.mutate({ id: g.id, amount, current: Number(g.current_amount) })} />
                  </div>
                )}
                {done && <p className="mt-3 text-center text-sm font-medium text-primary">🎉 Goal reached!</p>}
                {!done && <p className="mt-2 text-xs text-muted-foreground">Remaining: {fmt(remaining)}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContributeForm({ onSubmit }: { onSubmit: (n: number) => void }) {
  const [v, setV] = useState("");
  return (
    <form className="flex w-full gap-2" onSubmit={(e) => { e.preventDefault(); const n = parseFloat(v); if (!isFinite(n) || n <= 0) return; onSubmit(n); setV(""); }}>
      <Input placeholder="Add amount" type="number" step="0.01" value={v} onChange={(e) => setV(e.target.value)} />
      <Button type="submit">Add</Button>
    </form>
  );
}

function NewGoalDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");

  const m = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("goals").insert({
        user_id: user!.id, name, target_amount: parseFloat(target), current_amount: 0,
        deadline: deadline || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); toast.success("Goal created"); setOpen(false); setName(""); setTarget(""); setDeadline(""); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="lg" className="gap-2"><Plus className="h-4 w-4" />New goal</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create a savings goal</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
          <div className="space-y-1.5"><Label>What are you saving for?</Label><Input required placeholder="Emergency fund" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Target amount</Label><Input required type="number" step="0.01" placeholder="10000" value={target} onChange={(e) => setTarget(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Deadline (optional)</Label><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={m.isPending}>{m.isPending ? "Saving..." : "Create goal"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
