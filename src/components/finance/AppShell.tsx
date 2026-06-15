import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Receipt, Wallet, PieChart, TrendingUp, Bell, Bot, LogOut, Settings as SettingsIcon, Target, FileText, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, hint: "Overview & insights" },
  { to: "/transactions", label: "Transactions", icon: Receipt, hint: "All your money in & out" },
  { to: "/accounts", label: "Accounts", icon: Wallet, hint: "Banks, cards, cash" },
  { to: "/budgets", label: "Budgets", icon: PieChart, hint: "Monthly limits" },
  { to: "/goals", label: "Goals", icon: Target, hint: "Save toward targets" },
  { to: "/networth", label: "Net Worth", icon: TrendingUp, hint: "Wealth & investments" },
  { to: "/bills", label: "Bills", icon: Bell, hint: "Reminders" },
  { to: "/reports", label: "Reports", icon: FileText, hint: "Export PDF/Excel" },
  { to: "/assistant", label: "AI Assistant", icon: Bot, hint: "Ask anything" },
  { to: "/settings", label: "Settings", icon: SettingsIcon, hint: "Currency & profile" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-5 md:flex">
        <Link to="/dashboard" className="mb-8 flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl shadow-lg" style={{ background: "var(--gradient-primary)" }}>
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-xl font-bold">Vault</div>
            <div className="text-xs text-muted-foreground">Personal Finance OS</div>
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon, hint }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                aria-label={`${label} — ${hint}`}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-3 text-base transition",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", active && "text-primary")} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{label}</div>
                  <div className="truncate text-xs text-muted-foreground">{hint}</div>
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 border-t border-sidebar-border pt-4">
          <Button variant="outline" size="lg" className="w-full justify-start gap-3" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
              <Wallet className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold">Vault</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu className="h-6 w-6" /></Button>
        </div>

        {/* Mobile menu drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto bg-sidebar p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display text-lg font-bold">Menu</span>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></Button>
              </div>
              <nav className="space-y-1">
                {nav.map(({ to, label, icon: Icon, hint }) => {
                  const active = pathname.startsWith(to);
                  return (
                    <Link key={to} to={to} onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-3", active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50")}>
                      <Icon className="h-5 w-5" />
                      <div className="flex-1">
                        <div className="text-base font-medium">{label}</div>
                        <div className="text-xs text-muted-foreground">{hint}</div>
                      </div>
                    </Link>
                  );
                })}
              </nav>
              <Button variant="outline" className="mt-4 w-full gap-2" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 grid grid-cols-5 border-t border-border bg-sidebar md:hidden">
          {nav.slice(0, 5).map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link key={to} to={to} className={cn("flex flex-col items-center gap-1 py-2 text-[11px]", active ? "text-primary" : "text-muted-foreground")}>
                <Icon className="h-5 w-5" />{label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
