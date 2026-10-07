import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, fail, ok } from "../supabase";

export default defineTool({
  name: "critical_stock",
  title: "Estoque crítico",
  description: "Itens de estoque abaixo do mínimo e itens que vencem nos próximos dias em uma filial.",
  inputSchema: {
    branch_id: z.string().uuid().describe("ID da filial."),
    days: z.number().int().min(1).max(90).default(7).describe("Janela de vencimento em dias."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ branch_id, days }, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("stock_items")
      .select("name, quantity, min_stock, unit, expiry_date")
      .eq("branch_id", branch_id)
      .eq("is_active", true);
    if (error) return fail(error.message);
    const limit = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    const items = data ?? [];
    return ok(
      JSON.stringify({
        abaixo_do_minimo: items.filter((i) => Number(i.quantity) <= Number(i.min_stock)),
        vencendo: items.filter((i) => i.expiry_date && i.expiry_date <= limit),
      }),
    );
  },
});
