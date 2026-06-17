import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Settings as SettingsIcon, Globe, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — FinSpark" },
      { name: "description", content: "Manage your display currency, profile and account preferences." },
      { property: "og:title", content: "Settings — FinSpark" },
      { property: "og:description", content: "Currency and profile preferences." },
      { property: "og:url", content: "https://wealthtrackpro.lovable.app/settings" },
    ],
    links: [{ rel: "canonical", href: "https://wealthtrackpro.lovable.app/settings" }],
  }),
  component: SettingsPage,
});

const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
];

function SettingsPage() {
  const qc = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return { ...data, email: user!.email };
    },
  });

  const [displayName, setDisplayName] = useState("");
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    if (profile.data) {
      setDisplayName(profile.data.display_name ?? "");
      setCurrency(profile.data.currency ?? "USD");
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("profiles").update({
        display_name: displayName || null,
        currency,
      }).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["profile", "currency"] });
      toast.success("Settings saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Preferences</p>
        <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
          <SettingsIcon className="h-7 w-7" /> Settings
        </h1>
      </header>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold">Profile</h2>
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={profile.data?.email ?? ""} disabled />
        </div>
        <div className="space-y-1.5">
          <Label>Display name</Label>
          <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold">Currency</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Default currency for new accounts, transactions, and reports.
        </p>
        <div className="space-y-1.5">
          <Label>Preferred currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  <span className="font-tabular mr-2">{c.symbol}</span>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending || profile.isLoading}>
          {save.isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
