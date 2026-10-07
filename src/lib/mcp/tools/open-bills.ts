import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, fail, ok } from "../supabase";

export default defineTool({
  name: "open_bills",
  title: "Contas a pagar e receber",
  description: "Lista lançamentos financeiros pendentes (a pagar e a receber) de uma filial, ordenados pelo vencimento.",
  inputSchema: {
    branch_id: z.string().uuid().describe("ID da filial."),
    type: z.enum(["receita", "despesa", "todas"]).default("todas").describe("receita = a receber, despesa = a pagar."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ branch_id, type }, ctx) => {
    let q = supabaseForUser(ctx)
      .from("financial_transactions")
      .select("description, amount, due_date, type")
      .eq("branch_id", branch_id)
      .eq("status", "pendente")
      .order("due_date")
      .limit(200);
    if (type !== "todas") q = q.eq("type", type);
    const { data, error } = await q;
    if (error) return fail(error.message);
    return ok(JSON.stringify(data ?? []));
  },
});
