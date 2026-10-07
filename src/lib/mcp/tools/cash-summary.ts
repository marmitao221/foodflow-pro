import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, fail, ok } from "../supabase";

export default defineTool({
  name: "cash_summary",
  title: "Resumo do caixa",
  description: "Mostra o caixa aberto (ou o último) de uma filial com o total vendido por forma de pagamento.",
  inputSchema: { branch_id: z.string().uuid().describe("ID da filial (use list_branches).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ branch_id }, ctx) => {
    const sb = supabaseForUser(ctx);
    const { data: s, error } = await sb
      .from("cash_sessions")
      .select("id, status, opened_at, closed_at, opening_balance, operator_name")
      .eq("branch_id", branch_id)
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return fail(error.message);
    if (!s) return ok("Nenhum caixa encontrado para esta filial.");
    const { data: pays, error: e2 } = await sb.from("order_payments").select("method, amount").eq("session_id", s.id);
    if (e2) return fail(e2.message);
    const byMethod: Record<string, number> = {};
    let total = 0;
    for (const p of pays ?? []) {
      byMethod[p.method] = (byMethod[p.method] ?? 0) + Number(p.amount);
      total += Number(p.amount);
    }
    return ok(JSON.stringify({ session: s, total_vendas: total, por_forma: byMethod }));
  },
});
