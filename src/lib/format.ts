import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function money(n: number | string | null | undefined, currency = "USD") {
  const v = typeof n === "string" ? parseFloat(n) : n ?? 0;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(v || 0);
  } catch {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v || 0);
  }
}

export function currencySymbol(currency = "USD") {
  try {
    const parts = new Intl.NumberFormat(undefined, { style: "currency", currency }).formatToParts(0);
    return parts.find(p => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

export function shortMoney(n: number, currency = "USD") {
  const sym = currencySymbol(currency);
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${sym}${(n / 1_000).toFixed(1)}k`;
  return `${sym}${n.toFixed(0)}`;
}

/** React hook: returns the user's preferred currency code (defaults to USD). */
export function useCurrency(): string {
  const { data } = useQuery({
    queryKey: ["profile", "currency"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "USD";
      const { data, error } = await supabase.from("profiles").select("currency").eq("id", user.id).single();
      if (error) return "USD";
      return data?.currency ?? "USD";
    },
    staleTime: 60_000,
  });
  return data ?? "USD";
}

/** React hook: returns money formatters bound to the user's preferred currency. */
export function useMoney() {
  const currency = useCurrency();
  return {
    currency,
    fmt: (n: number | string | null | undefined) => money(n, currency),
    short: (n: number) => shortMoney(n, currency),
    symbol: currencySymbol(currency),
  };
}
