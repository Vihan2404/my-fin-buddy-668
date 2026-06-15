import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: txns }, { data: cats }, { data: accs }] = await Promise.all([
      supabase.from("transactions").select("amount,type,description,merchant,occurred_at,category_id").order("occurred_at", { ascending: false }).limit(400),
      supabase.from("categories").select("id,name"),
      supabase.from("accounts").select("balance,is_liability"),
    ]);
    const catMap = new Map((cats ?? []).map((c: any) => [c.id, c.name]));

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const thisMonthExp = (txns ?? []).filter((t: any) => t.type === "expense" && new Date(t.occurred_at) >= monthStart);
    const lastMonthExp = (txns ?? []).filter((t: any) => t.type === "expense" && new Date(t.occurred_at) >= lastMonthStart && new Date(t.occurred_at) <= lastMonthEnd);
    const thisTotal = thisMonthExp.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const lastTotal = lastMonthExp.reduce((s: number, t: any) => s + Number(t.amount), 0);

    // Top merchants this month
    const merchantTotals = new Map<string, number>();
    thisMonthExp.forEach((t: any) => {
      const k = t.merchant || t.description || "Other";
      merchantTotals.set(k, (merchantTotals.get(k) ?? 0) + Number(t.amount));
    });
    const topMerchants = [...merchantTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    // Anomaly: per-category, compare this month vs trailing 3-month average
    const catAggregate = new Map<string, { thisMonth: number; prevAvg: number[] }>();
    (txns ?? []).forEach((t: any) => {
      if (t.type !== "expense") return;
      const d = new Date(t.occurred_at);
      const key = t.category_id ? catMap.get(t.category_id) ?? "Uncategorized" : "Uncategorized";
      const rec = catAggregate.get(key) ?? { thisMonth: 0, prevAvg: [0, 0, 0] };
      if (d >= monthStart) rec.thisMonth += Number(t.amount);
      else {
        for (let i = 0; i < 3; i++) {
          const ms = new Date(now.getFullYear(), now.getMonth() - 1 - i, 1);
          const me = new Date(now.getFullYear(), now.getMonth() - i, 0, 23, 59, 59);
          if (d >= ms && d <= me) rec.prevAvg[i] += Number(t.amount);
        }
      }
      catAggregate.set(key, rec);
    });
    const anomalies: { category: string; thisMonth: number; avg: number; deltaPct: number }[] = [];
    catAggregate.forEach((v, k) => {
      const avg = (v.prevAvg[0] + v.prevAvg[1] + v.prevAvg[2]) / 3;
      if (avg > 20 && v.thisMonth > avg * 1.4) {
        anomalies.push({ category: k, thisMonth: v.thisMonth, avg, deltaPct: ((v.thisMonth - avg) / avg) * 100 });
      }
    });
    anomalies.sort((a, b) => b.deltaPct - a.deltaPct);

    // Top categories this month
    const catTotals = new Map<string, number>();
    thisMonthExp.forEach((t: any) => {
      const k = t.category_id ? catMap.get(t.category_id) ?? "Uncategorized" : "Uncategorized";
      catTotals.set(k, (catTotals.get(k) ?? 0) + Number(t.amount));
    });
    const topCategories = [...catTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, amount]) => ({ name, amount }));

    const assets = (accs ?? []).filter((a: any) => !a.is_liability).reduce((s: number, a: any) => s + Number(a.balance), 0);
    const liabilities = (accs ?? []).filter((a: any) => a.is_liability).reduce((s: number, a: any) => s + Number(a.balance), 0);

    return {
      thisMonthSpend: thisTotal,
      lastMonthSpend: lastTotal,
      monthDeltaPct: lastTotal ? ((thisTotal - lastTotal) / lastTotal) * 100 : 0,
      topMerchants,
      topCategories,
      anomalies: anomalies.slice(0, 5),
      assets,
      liabilities,
    };
  });

export const getAiBrief = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: txns }, { data: accs }, { data: cats }] = await Promise.all([
      supabase.from("transactions").select("amount,type,occurred_at,category_id,merchant,description").order("occurred_at", { ascending: false }).limit(120),
      supabase.from("accounts").select("name,balance,is_liability,type"),
      supabase.from("categories").select("id,name"),
    ]);
    const catMap = new Map((cats ?? []).map((c: any) => [c.id, c.name]));
    const snapshot = {
      accounts: accs,
      transactions: (txns ?? []).map((t: any) => ({
        amount: Number(t.amount), type: t.type, date: t.occurred_at,
        category: t.category_id ? catMap.get(t.category_id) : null,
        merchant: t.merchant ?? t.description,
      })),
    };
    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a friendly personal financial assistant. Give a 2-sentence briefing on the user's financial picture. Be encouraging, specific with numbers, and end with one concrete tip. Plain text only, no markdown. Keep it under 60 words." },
            { role: "user", content: `Snapshot: ${JSON.stringify(snapshot).slice(0, 8000)}` },
          ],
        }),
      });
      if (!r.ok) return { brief: "" };
      const j = await r.json();
      return { brief: (j.choices?.[0]?.message?.content ?? "").trim() };
    } catch {
      return { brief: "" };
    }
  });
