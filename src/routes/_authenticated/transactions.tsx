import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { qTransactions, qAccounts, qCategories } from "@/lib/finance-queries";
import { useServerFn } from "@tanstack/react-start";
import { aiCategorize } from "@/lib/ai.functions";
import { extractReceipt } from "@/lib/receipt.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMoney } from "@/lib/format";
import { Plus, Sparkles, Trash2, Camera, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { useRef } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — FinSpark" },
      { name: "description", content: "Log, search and categorize every transaction. Scan receipts and let AI auto-categorize your spending." },
      { property: "og:title", content: "Transactions — FinSpark" },
      { property: "og:description", content: "All your money in and out, in one searchable ledger." },
      { property: "og:url", content: "https://wealthtrackpro.lovable.app/transactions" },
    ],
    links: [{ rel: "canonical", href: "https://wealthtrackpro.lovable.app/transactions" }],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const { fmt: money } = useMoney();
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
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Ledger</p>
          <h1 className="truncate font-display text-3xl font-semibold">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Scan a receipt or add transactions manually.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportDialog accounts={accounts.data ?? []} categories={categories.data ?? []} />
          <NewTransactionDialog accounts={accounts.data ?? []} categories={categories.data ?? []} />
        </div>
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
                    <div>
                      <div>{t.description || t.merchant || "—"}</div>
                      {t.merchant && t.description && <div className="text-xs text-muted-foreground">{t.merchant}</div>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{cat?.name ?? <span className="italic opacity-60">Uncategorized</span>}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.account_id ? accMap.get(t.account_id) : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className={"rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider " + (isIncome ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive")} aria-label={isIncome ? "Credit" : "Debit"}>
                        {isIncome ? "Cr" : "Dr"}
                      </span>
                      <span className={"font-tabular font-medium " + (isIncome ? "text-primary" : "text-foreground")}>{money(Math.abs(Number(t.amount)))}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3"><Button variant="ghost" size="icon" aria-label="Delete transaction" onClick={() => del.mutate(t.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button></td>
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
  const scanFn = useServerFn(extractReceipt);
  const [aiLoading, setAiLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const onPickReceipt = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 6_000_000) return toast.error("Image too large (max 6 MB)");
    setScanLoading(true);
    const dataUrl: string = await new Promise((res, rej) => {
      const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file);
    });
    try {
      const result = await scanFn({ data: { imageDataUrl: dataUrl } });
      if (!result.ok) { toast.error(result.error); return; }
      const d = result.data;
      if (d.merchant) setDescription(d.merchant + (d.description ? ` — ${d.description}` : ""));
      else if (d.description) setDescription(d.description);
      if (d.amount) setAmount(String(d.amount));
      if (d.date) setDate(d.date);
      setType("expense");
      setOpen(true);
      toast.success("Receipt scanned! Review and save.");
    } catch (err: any) {
      toast.error(err?.message ?? "Scan failed");
    } finally {
      setScanLoading(false);
    }
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
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="lg" className="gap-2" onClick={onPickReceipt} disabled={scanLoading}>
          <Camera className="h-4 w-4" />{scanLoading ? "Scanning…" : "Scan receipt"}
        </Button>
        <DialogTrigger asChild><Button size="lg" className="gap-2"><Plus className="h-4 w-4" />Add transaction</Button></DialogTrigger>
      </div>
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

type ParsedRow = { date: string; amount: number; description: string; category: string; type: "expense" | "income" };

function parseDate(v: any): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return format(v, "yyyy-MM-dd");
  if (typeof v === "number") {
    // Excel serial date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : format(d, "yyyy-MM-dd");
  }
  const s = String(v).trim();
  const d = new Date(s);
  if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
  return null;
}

function ImportDialog({ accounts, categories }: { accounts: any[]; categories: any[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState<string>("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setRows([]); setFileName(""); setAccountId(""); };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const parsed: ParsedRow[] = [];
      for (const r of raw) {
        const keys = Object.fromEntries(Object.entries(r).map(([k, v]) => [String(k).toLowerCase().trim(), v]));
        const date = parseDate(keys["date"] ?? keys["transaction date"] ?? keys["occurred_at"]);
        const amtRaw = keys["amount"] ?? keys["amt"] ?? keys["value"];
        const amount = typeof amtRaw === "number" ? amtRaw : parseFloat(String(amtRaw).replace(/[^0-9.\-]/g, ""));
        if (!date || !isFinite(amount) || amount === 0) continue;
        const typeRaw = String(keys["type"] ?? "").toLowerCase();
        const type: "expense" | "income" = (typeRaw === "income" || typeRaw === "credit" || typeRaw === "cr") ? "income" : "expense";
        parsed.push({
          date,
          amount: Math.abs(amount),
          description: String(keys["description"] ?? keys["note"] ?? keys["memo"] ?? "").trim(),
          category: String(keys["category"] ?? keys["cat"] ?? "").trim(),
          type,
        });
      }
      if (parsed.length === 0) return toast.error("No valid rows found. Expected columns: Date, Category, Amount, Description.");
      setRows(parsed);
      setFileName(file.name);
      setOpen(true);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to read file");
    }
  };

  const doImport = async () => {
    if (!accountId) return toast.error("Pick an account to debit");
    if (rows.length === 0) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // Build category map (lowercased name → id), creating missing ones
      const catByName = new Map<string, string>();
      for (const c of categories) catByName.set(String(c.name).toLowerCase(), c.id);
      const missing = new Set<string>();
      for (const r of rows) if (r.category && !catByName.has(r.category.toLowerCase())) missing.add(r.category);
      if (missing.size > 0) {
        const toInsert = Array.from(missing).map(name => ({ user_id: user.id, name, kind: "expense" as const }));
        const { data: created, error: ce } = await supabase.from("categories").insert(toInsert).select("id,name");
        if (ce) throw ce;
        for (const c of created ?? []) catByName.set(String(c.name).toLowerCase(), c.id);
      }

      const payload = rows.map(r => ({
        user_id: user.id,
        account_id: accountId,
        category_id: r.category ? catByName.get(r.category.toLowerCase()) ?? null : null,
        type: r.type,
        amount: r.amount,
        description: r.description || null,
        occurred_at: new Date(r.date).toISOString(),
      }));

      // Insert in chunks of 200
      for (let i = 0; i < payload.length; i += 200) {
        const slice = payload.slice(i, i + 200);
        const { error } = await supabase.from("transactions").insert(slice);
        if (error) throw error;
      }

      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success(`Imported ${payload.length} transactions`);
      setOpen(false);
      reset();
    } catch (err: any) {
      toast.error(err?.message ?? "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const total = rows.reduce((s, r) => s + (r.type === "expense" ? r.amount : -r.amount), 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={onFile} />
      <Button variant="outline" size="lg" className="gap-2" onClick={() => fileRef.current?.click()}>
        <Upload className="h-4 w-4" /> Import Excel
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Import from {fileName || "spreadsheet"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Found <strong>{rows.length}</strong> rows. They will be added as transactions and the chosen account
            will be debited by <strong>{total.toFixed(2)}</strong> total.
          </p>
          <div className="space-y-1.5">
            <Label>Debit from account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Pick an account" /></SelectTrigger>
              <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card text-left text-muted-foreground">
                <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Description</th><th className="px-3 py-2">Category</th><th className="px-3 py-2 text-right">Amount</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="px-3 py-1.5">{r.date}</td>
                    <td className="px-3 py-1.5">{r.description || "—"}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{r.category || "—"}</td>
                    <td className="px-3 py-1.5 text-right font-tabular">
                      <span className={"mr-1 rounded px-1 py-0.5 text-[9px] font-semibold uppercase " + (r.type === "income" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive")}>{r.type === "income" ? "Cr" : "Dr"}</span>
                      {r.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {rows.length > 50 && <tr><td colSpan={4} className="p-2 text-center text-muted-foreground">…and {rows.length - 50} more</td></tr>}
              </tbody>
            </table>
          </div>
          <Button className="w-full" size="lg" onClick={doImport} disabled={busy || !accountId}>{busy ? "Importing…" : `Import ${rows.length} transactions`}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
