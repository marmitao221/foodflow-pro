import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listBranches from "./tools/list-branches";
import cashSummary from "./tools/cash-summary";
import salesPeriod from "./tools/sales-period";
import criticalStock from "./tools/critical-stock";
import openBills from "./tools/open-bills";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "foodflow-pro",
  title: "FoodFlow Pro",
  version: "0.1.0",
  instructions:
    "Consulta (somente leitura) do sistema de gestão do restaurante: caixa, vendas, estoque e financeiro. Chame list_branches primeiro para obter o id da filial. Valores em R$.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listBranches, cashSummary, salesPeriod, criticalStock, openBills],
});
