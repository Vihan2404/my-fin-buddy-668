import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiChat } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, Bot, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant — Vault" },
      { name: "description", content: "Ask plain-English questions about your money: spending by category, monthly trends, anomalies and more." },
      { property: "og:title", content: "AI Assistant — Vault" },
      { property: "og:description", content: "Natural-language finance assistant." },
      { property: "og:url", content: "https://wealthtrackpro.lovable.app/assistant" },
    ],
    links: [{ rel: "canonical", href: "https://wealthtrackpro.lovable.app/assistant" }],
  }),
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How much did I spend on food last month?",
  "What's my savings rate this month?",
  "Where can I cut spending?",
  "Show me my biggest expense categories",
];

function AssistantPage() {
  const chat = useServerFn(aiChat);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi — I'm Vault. Ask me anything about your money. I can analyze spending, suggest budgets, and spot trends." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next); setInput(""); setLoading(true);
    try {
      const { reply } = await chat({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e: any) {
      toast.error(e.message ?? "AI error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-6">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">AI</p>
        <h1 className="font-display text-3xl font-semibold">Assistant</h1>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-border bg-card p-5">
        {messages.map((m, i) => (
          <div key={i} className={"flex gap-3 " + (m.role === "user" ? "justify-end" : "")}>
            {m.role === "assistant" && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}><Bot className="h-4 w-4 text-primary-foreground" /></div>}
            <div className={"max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm " + (m.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent")}>{m.content}</div>
            {m.role === "user" && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent"><User className="h-4 w-4" /></div>}
          </div>
        ))}
        {loading && <div className="flex gap-3"><div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}><Bot className="h-4 w-4 text-primary-foreground" /></div><div className="rounded-2xl bg-accent px-4 py-2.5 text-sm text-muted-foreground">Thinking…</div></div>}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground">
              <Sparkles className="h-3 w-3 text-primary" /> {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); send(); }} className="mt-4 flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about your finances..." disabled={loading} />
        <Button type="submit" disabled={loading} className="gap-2"><Send className="h-4 w-4" />Send</Button>
      </form>
    </div>
  );
}
