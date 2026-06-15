import { supabase } from "@/integrations/supabase/client";

export type Account = {
  id: string; name: string; type: string; institution: string | null;
  balance: number; currency: string; is_liability: boolean; notes: string | null;
};
export type Category = { id: string; name: string; icon: string | null; color: string | null; kind: "income" | "expense" | "transfer" };
export type Transaction = {
  id: string; account_id: string | null; category_id: string | null;
  type: "income" | "expense" | "transfer"; amount: number; currency: string;
  description: string | null; merchant: string | null; occurred_at: string; recurrence: string;
};
export type Budget = { id: string; category_id: string | null; amount: number; period: string };
export type Bill = { id: string; name: string; amount: number; due_date: string; recurrence: string; is_paid: boolean };
export type Investment = { id: string; symbol: string; name: string | null; asset_class: string; quantity: number; avg_cost: number; current_price: number };
export type Goal = { id: string; name: string; target_amount: number; current_amount: number; deadline: string | null; icon: string | null; color: string | null };

export const qGoals = {
  queryKey: ["goals"] as const,
  queryFn: async () => {
    const { data, error } = await supabase.from("goals").select("*").order("created_at");
    if (error) throw error;
    return (data ?? []) as Goal[];
  },
};

export const qAccounts = {
  queryKey: ["accounts"] as const,
  queryFn: async () => {
    const { data, error } = await supabase.from("accounts").select("*").order("created_at");
    if (error) throw error;
    return (data ?? []) as Account[];
  },
};
export const qCategories = {
  queryKey: ["categories"] as const,
  queryFn: async () => {
    const { data, error } = await supabase.from("categories").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as Category[];
  },
};
export const qTransactions = {
  queryKey: ["transactions"] as const,
  queryFn: async () => {
    const { data, error } = await supabase.from("transactions").select("*").order("occurred_at", { ascending: false }).limit(500);
    if (error) throw error;
    return (data ?? []) as Transaction[];
  },
};
export const qBudgets = {
  queryKey: ["budgets"] as const,
  queryFn: async () => {
    const { data, error } = await supabase.from("budgets").select("*");
    if (error) throw error;
    return (data ?? []) as Budget[];
  },
};
export const qBills = {
  queryKey: ["bills"] as const,
  queryFn: async () => {
    const { data, error } = await supabase.from("bills").select("*").order("due_date");
    if (error) throw error;
    return (data ?? []) as Bill[];
  },
};
export const qInvestments = {
  queryKey: ["investments"] as const,
  queryFn: async () => {
    const { data, error } = await supabase.from("investments").select("*").order("symbol");
    if (error) throw error;
    return (data ?? []) as Investment[];
  },
};
