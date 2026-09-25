import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

const API = "https://merchant-api.ifood.com.br";

type IfoodEvent = {
  id?: string;
  code?: string;
  fullCode?: string;
  orderId?: string;
  merchantId?: string;
};

async function getToken(clientId: string, clientSecret: string) {
  const res = await fetch(`${API}/authentication/v1.0/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grantType: "client_credentials", clientId, clientSecret }),
  });
  if (!res.ok) throw new Error(`iFood token [${res.status}]: ${await res.text()}`);
  const j = (await res.json()) as { accessToken: string };
  return j.accessToken;
}

export const Route = createFileRoute("/api/public/ifood/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const clientId = process.env["IFOOD_CLIENT_ID"];
        const clientSecret = process.env["IFOOD_CLIENT_SECRET"];
        if (!clientId || !clientSecret) return new Response("Not configured", { status: 503 });

        const body = await request.text();
        const sig = request.headers.get("x-ifood-signature") ?? "";
        const expected = createHmac("sha256", clientSecret).update(body).digest("hex");
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(body);
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }
        const events = (Array.isArray(parsed) ? parsed : [parsed]) as IfoodEvent[];
        const concluded = events.filter(
          (e) => e?.orderId && (e.code === "CON" || e.fullCode === "CONCLUDED"),
        );
        if (concluded.length === 0) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let token: string | null = null;

        for (const ev of concluded) {
          const orderId = String(ev.orderId);
          const { data: exists } = await supabaseAdmin
            .from("delivery_orders")
            .select("id")
            .eq("provider", "ifood")
            .eq("external_id", orderId)
            .maybeSingle();
          if (exists) continue;

          token ??= await getToken(clientId, clientSecret);
          const res = await fetch(`${API}/order/v1.0/orders/${encodeURIComponent(orderId)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            console.error(`iFood order [${res.status}]: ${await res.text()}`);
            continue;
          }
          const order = (await res.json()) as {
            displayId?: string;
            merchant?: { id?: string };
            total?: { orderAmount?: number };
          };
          const merchantId = order.merchant?.id ?? ev.merchantId;
          const amount = Number(order.total?.orderAmount ?? 0);
          if (!merchantId || !(amount > 0)) continue;

          const { data: integ } = await supabaseAdmin
            .from("delivery_integrations")
            .select("company_id, branch_id")
            .eq("provider", "ifood")
            .eq("merchant_id", merchantId)
            .eq("is_active", true)
            .maybeSingle();
          if (!integ) continue;

          const { data: row, error: insErr } = await supabaseAdmin
            .from("delivery_orders")
            .insert({
              company_id: integ.company_id,
              branch_id: integ.branch_id,
              provider: "ifood",
              external_id: orderId,
              display_id: order.displayId ?? null,
              amount,
            })
            .select("id")
            .single();
          if (insErr || !row) continue; // duplicate

          const { data: session } = await supabaseAdmin
            .from("cash_sessions")
            .select("id")
            .eq("branch_id", integ.branch_id)
            .eq("status", "aberto")
            .order("opened_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!session) continue; // stays pending until a cash session opens

          const { data: oid, error } = await supabaseAdmin.rpc("register_delivery_sale", {
            _session_id: session.id,
            _method: "ifood_online",
            _amount: amount,
            _ref: order.displayId ?? orderId,
          });
          if (error) {
            console.error("register_delivery_sale", error);
            continue;
          }
          await supabaseAdmin
            .from("delivery_orders")
            .update({ order_id: oid as string, session_id: session.id })
            .eq("id", row.id);
        }
        return new Response("ok");
      },
    },
  },
});
