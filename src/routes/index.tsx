import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Sparkles, Shield, Wallet, TrendingUp, Receipt, Target, Bell, PieChart, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinSpark — Simple personal finance for everyone" },
      { name: "description", content: "Track expenses, accounts, bills, budgets and net worth in one calm, senior-friendly dashboard. 28-day free trial, no card needed." },
      { property: "og:title", content: "FinSpark — Simple personal finance for everyone" },
      { property: "og:description", content: "One clear place for every account, bill and goal. 28-day free trial." },
      { property: "og:url", content: "https://wealthtrackpro.lovable.app/" },
      { name: "twitter:title", content: "FinSpark — Simple personal finance for everyone" },
      { name: "twitter:description", content: "One clear place for every account, bill and goal." },
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
          description: "Personal finance app to track expenses, accounts, bills, budgets, goals and net worth — with a 28-day free trial.",
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

const features = [
  { icon: Wallet, title: "All accounts in one place", desc: "Bank, credit card, cash, loans and investments — see every balance side by side." },
  { icon: Receipt, title: "Effortless transactions", desc: "Log money in and out as Dr/Cr. Import from Excel in seconds. Transfer between your own accounts." },
  { icon: PieChart, title: "Budgets that make sense", desc: "Set a monthly limit per category. Watch progress in big, easy-to-read bars." },
  { icon: Bell, title: "Never miss a bill", desc: "Add your recurring bills and get a clear list of what's due, what's paid." },
  { icon: Target, title: "Goals & savings", desc: "Set a target, track progress visually, hit your milestones." },
  { icon: TrendingUp, title: "Net worth & investments", desc: "Track assets minus liabilities. Add stocks, gold, real estate — see the full picture." },
  { icon: FileText, title: "Reports you can keep", desc: "Export to PDF, Excel, CSV or JSON. Take your data with you, anytime." },
  { icon: Shield, title: "Private & secure", desc: "Your data is yours alone. Row-level security keeps it scoped to you." },
];

const plans = [
  { name: "Free Trial", price: "Free", period: "28 days", highlight: "No card needed", features: ["All core features", "Unlimited accounts", "Unlimited transactions", "Export reports"] },
  { name: "Monthly", price: "Contact us", period: "30 days", highlight: "Pay-as-you-go", features: ["Everything in Trial", "Priority support", "Renew anytime"] },
  { name: "Yearly", price: "Contact us", period: "365 days", highlight: "Best value", features: ["Everything in Monthly", "2 months free vs monthly", "Best for serious savers"] },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: "var(--gradient-glow)" }} />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]" style={{ backgroundImage: "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-semibold">FinSpark</span>
        </div>
        <nav className="flex items-center gap-2">
          <a href="#features" className="hidden text-sm text-muted-foreground hover:text-foreground md:inline">Features</a>
          <a href="#pricing" className="hidden text-sm text-muted-foreground hover:text-foreground md:inline">Pricing</a>
          <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/auth"><Button size="sm">Start free</Button></Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" /> AI-powered insights coming soon in v2
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            Money, made <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>simple.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            FinSpark brings every account, bill, budget and goal into one calm, easy-to-read dashboard — designed for everyone, including parents and grandparents.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth"><Button size="lg" className="gap-2">Start 28-day free trial <ArrowRight className="h-4 w-4" /></Button></Link>
            <a href="#features"><Button size="lg" variant="outline">See what's inside</Button></a>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">No credit card required · Cancel anytime</p>
        </div>

        <div id="features" className="mt-24">
          <h2 className="mb-3 text-center font-display text-3xl font-semibold">Everything you need. Nothing you don't.</h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-muted-foreground">Built around the things people actually do with their money — track, plan, save, review.</p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group rounded-xl border border-border bg-card p-6 transition hover:border-primary/40">
                <Icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div id="pricing" className="mt-24">
          <h2 className="mb-3 text-center font-display text-3xl font-semibold">Honest pricing</h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-muted-foreground">
            Start free for 28 days. After that, contact us to renew — we keep things personal and simple.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((p, i) => (
              <div key={p.name} className={`rounded-xl border bg-card p-6 ${i === 2 ? "border-primary/60 shadow-lg" : "border-border"}`}>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                  <span className="text-xs text-muted-foreground">{p.highlight}</span>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-bold">{p.price}</span>
                  <span className="text-sm text-muted-foreground">/ {p.period}</span>
                </div>
                <ul className="mt-5 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Version 1 is free for everyone during the trial. <span className="text-foreground">AI features arrive in version 2.</span>
          </p>
        </div>

        <div className="mt-24 rounded-2xl border border-border bg-card p-8 text-center md:p-12">
          <BarChart3 className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-4 font-display text-3xl font-semibold">Take 5 minutes. See your whole financial life.</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">Add an account, import a few transactions, set one budget. That's all it takes to start.</p>
          <Link to="/auth" className="mt-6 inline-block"><Button size="lg" className="gap-2">Create your free account <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} FinSpark — Money, made simple.
      </footer>
    </div>
  );
}
