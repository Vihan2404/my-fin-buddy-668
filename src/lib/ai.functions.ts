import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const aiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      messages: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string().min(1).max(4000) })).min(1).max(40),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Compact financial snapshot to ground the assistant.
    const [{ data: accounts }, { data: txns }, { data: budgets }, { data: cats }] = await Promise.all([
      supabase.from("accounts").select("name,type,balance,currency,is_liability"),
      supabase.from("transactions").select("amount,type,description,merchant,occurred_at,category_id").order("occurred_at", { ascending: false }).limit(150),
      supabase.from("budgets").select("amount,category_id,period"),
      supabase.from("categories").select("id,name,kind"),
    ]);

    const catMap = new Map((cats ?? []).map((c) => [c.id, c.name]));
    const snapshot = {
      user_id: userId,
      accounts,
      recent_transactions: (txns ?? []).map((t) => ({
        amount: Number(t.amount),
        type: t.type,
        date: t.occurred_at,
        description: t.description,
        merchant: t.merchant,
        category: t.category_id ? catMap.get(t.category_id) : null,
      })),
      budgets: (budgets ?? []).map((b) => ({ amount: Number(b.amount), category: b.category_id ? catMap.get(b.category_id) : null, period: b.period })),
    };

    const system = `You are FinSpark, an AI personal-finance assistant. Use ONLY the user's financial snapshot below to answer.
Be concise, friendly, and quantitative. Use the user's currency. Format money like $1,234.56. If data is insufficient, say so briefly.

USER FINANCIAL SNAPSHOT (JSON):
${JSON.stringify(snapshot).slice(0, 14000)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, ...data.messages],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) return { reply: "AI is rate-limited right now — please try again in a moment." };
      if (res.status === 402) return { reply: "AI credits exhausted. Please top up workspace credits." };
      console.error("AI error", res.status, text);
      return { reply: "Sorry, the AI service had an error. Try again." };
    }
    const json = await res.json();
    const reply: string = json.choices?.[0]?.message?.content ?? "No response.";
    return { reply };
  });

export const aiCategorize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ description: z.string().min(1).max(500), amount: z.number(), categories: z.array(z.string().min(1).max(80)).min(1).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: `Choose ONE category from this list that best fits the transaction. Reply ONLY with the exact category name. Categories: ${data.categories.join(", ")}` },
          { role: "user", content: `Transaction: "${data.description}" amount $${data.amount}` },
        ],
      }),
    });
    if (!res.ok) return { category: null as string | null };
    const json = await res.json();
    const out = (json.choices?.[0]?.message?.content ?? "").trim();
    const match = data.categories.find((c) => c.toLowerCase() === out.toLowerCase()) ?? null;
    return { category: match };
  });
