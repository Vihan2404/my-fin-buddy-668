import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const extractReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ imageDataUrl: z.string().min(20).max(8_000_000) }).parse(d))
  .handler(async ({ data }) => {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Extract receipt info. Reply ONLY with a JSON object like: {\"merchant\":\"...\",\"amount\":12.34,\"date\":\"YYYY-MM-DD\",\"description\":\"short summary\"}. If unsure, use null. Today is " +
              new Date().toISOString().slice(0, 10) + ".",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the receipt details from this image." },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return { ok: false as const, error: r.status === 402 ? "AI credits exhausted." : r.status === 429 ? "AI rate-limited. Try again." : `AI error: ${t.slice(0, 200)}` };
    }
    const j = await r.json();
    const raw: string = j.choices?.[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      return { ok: true as const, data: parsed as { merchant?: string; amount?: number; date?: string; description?: string } };
    } catch {
      return { ok: false as const, error: "Could not parse receipt" };
    }
  });
