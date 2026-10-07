import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, fail, ok } from "../supabase";

export default defineTool({
  name: "sales_period",
  title: "Vendas do período",
  description: "Faturamento e número de comandas fechadas de uma filial entre duas datas (AAAA-MM-DD, inclusivas).",
  inputSchema: {
    branch_id: z.string().uuid().describe("ID da filial."),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Data inicial."),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Data final."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ branch_id, start_date, end_date }, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("orders")
      .select("total, type")
      .eq("branch_id", branch_id)
      .eq("status", "fechada")
      .gte("closed_at", `${start_date}T00:00:00-04:00`)
      .lte("closed_at", `${end_date}T23:59:59-04:00`);
    if (error) return fail(error.message);
    const porTipo: Record<string, number> = {};
    let total = 0;
    for (const o of data ?? []) {
      porTipo[o.type] = (porTipo[o.type] ?? 0) + Number(o.total);
      total += Number(o.total);
    }
    return ok(JSON.stringify({ comandas: data?.length ?? 0, faturamento: total, por_tipo: porTipo }));
  },
});
