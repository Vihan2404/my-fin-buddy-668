import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Sparkles, Shield, Wallet, TrendingUp, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinSpark — Personal Finance OS" },
      { name: "description", content: "Track expenses, net worth, investments, budgets and bills with AI insights and natural-language queries." },
      { property: "og:title", content: "FinSpark — Personal Finance OS" },
      { property: "og:description", content: "Your money, all in one beautifully dark place." },
      { property: "og:url", content: "https://wealthtrackpro.lovable.app/" },
      { name: "twitter:title", content: "FinSpark — Personal Finance OS" },
      { name: "twitter:description", content: "Your money, all in one beautifully dark place." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a2993958-7a25-4a22-914a-2794e99d3ae9/id-preview-f0e94490--d76ad77c-8db1-432c-9172-9f8ef79446e6.lovable.app-1780830396539.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a2993958-7a25-4a22-914a-2794e99d3ae9/id-preview-f0e94490--d76ad77c-8db1-432c-9172-9f8ef79446e6.lovable.app-1780830396539.png" },
    ],
    links: [{ rel: "canonical", href: "https://wealthtrackpro.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "FinSpark",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          url: "https://wealthtrackpro.lovable.app/",
          description: "Personal finance OS to track expenses, net worth, investments, budgets and bills with AI insights.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "FinSpark",
          url: "https://wealthtrackpro.lovable.app/",
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: "var(--gradient-glow)" }} />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]" style={{ backgroundImage: "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
            <Wallet className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold">FinSpark</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/auth"><Button size="sm">Get started</Button></Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" /> AI-powered finance, built for clarity
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            Every dollar.<br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>One source of truth.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
            Track expenses, manage accounts, watch your net worth grow, and ask an AI assistant questions about your money in plain English.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/auth"><Button size="lg" className="gap-2">Start tracking <ArrowRight className="h-4 w-4" /></Button></Link>
            <a href="#features"><Button size="lg" variant="outline">See features</Button></a>
          </div>
        </div>

        <div id="features" className="mt-24 grid gap-4 md:grid-cols-3">
          {[
            { icon: Wallet, title: "Unified accounts", desc: "Bank, credit cards, cash, loans and investments — all in one ledger." },
            { icon: TrendingUp, title: "Net worth tracking", desc: "Assets minus liabilities, updated live as you log activity." },
            { icon: BarChart3, title: "Smart analytics", desc: "Cash-flow, savings rate, category trends, and your financial health score." },
            { icon: Bot, title: "AI assistant", desc: "Ask: \"How much did I spend on food last month?\" — get answers." },
            { icon: Sparkles, title: "Auto-categorization", desc: "AI suggests categories and flags spending anomalies." },
            { icon: Shield, title: "Secure by default", desc: "Row-level encryption, your data scoped only to you." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group rounded-xl border border-border bg-card p-6 transition hover:border-primary/40">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} FinSpark — Your money, all in one place.
      </footer>
    </div>
  );
}
