import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

async function fetchQuote(symbol: string): Promise<{ symbol: string; price: number; change: number; changePct: number; currency: string; name?: string } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!r.ok) return null;
    const j: any = await r.json();
    const meta = j?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = Number(meta.regularMarketPrice ?? 0);
    const prev = Number(meta.chartPreviousClose ?? meta.previousClose ?? price);
    const change = price - prev;
    return {
      symbol: meta.symbol ?? symbol,
      price,
      change,
      changePct: prev ? (change / prev) * 100 : 0,
      currency: meta.currency ?? "USD",
      name: meta.longName ?? meta.shortName ?? undefined,
    };
  } catch {
    return null;
  }
}

export const getQuotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ symbols: z.array(z.string().min(1).max(20)).min(1).max(50) }).parse(d))
  .handler(async ({ data }) => {
    const quotes = await Promise.all(data.symbols.map(fetchQuote));
    return { quotes: quotes.filter(Boolean) };
  });

export const refreshHoldings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: invs, error } = await supabase.from("investments").select("id,symbol");
    if (error) throw error;
    const list = invs ?? [];
    if (list.length === 0) return { updated: 0 };
    const quotes = await Promise.all(list.map((i) => fetchQuote(i.symbol)));
    let updated = 0;
    await Promise.all(
      list.map(async (inv, idx) => {
        const q = quotes[idx];
        if (!q || !q.price) return;
        const { error } = await supabase.from("investments").update({ current_price: q.price }).eq("id", inv.id);
        if (!error) updated++;
      }),
    );
    return { updated };
  });

export const getFxRates = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD", { headers: { "User-Agent": UA } });
    if (!r.ok) return { rates: {} as Record<string, number>, base: "USD" };
    const j: any = await r.json();
    return { rates: (j.rates ?? {}) as Record<string, number>, base: "USD" };
  } catch {
    return { rates: {} as Record<string, number>, base: "USD" };
  }
});
