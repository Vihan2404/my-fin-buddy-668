import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Receipt, Wallet, PieChart, TrendingUp, Bell, Bot, LogOut, Settings as SettingsIcon } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/budgets", label: "Budgets", icon: PieChart },
  { to: "/networth", label: "Net worth", icon: TrendingUp },
  { to: "/bills", label: "Bills", icon: Bell },
  { to: "/assistant", label: "AI Assistant", icon: Bot },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Link to="/dashboard" className="mb-8 flex items-center gap-2 px-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
            <Wallet className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold">Vault</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 space-y-1 border-t border-sidebar-border pt-4">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-3" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* mobile top bar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md" style={{ background: "var(--gradient-primary)" }}>
              <Wallet className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold">Vault</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </div>
        <main className="flex-1 overflow-y-auto">{children}</main>
        {/* mobile bottom nav */}
        <nav className="grid grid-cols-5 border-t border-border bg-sidebar md:hidden">
          {nav.slice(0, 5).map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link key={to} to={to} className={cn("flex flex-col items-center gap-1 py-2 text-[10px]", active ? "text-primary" : "text-muted-foreground")}>
                <Icon className="h-4 w-4" />{label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
