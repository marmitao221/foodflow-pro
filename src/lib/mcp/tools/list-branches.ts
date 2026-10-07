import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, fail, ok } from "../supabase";

export default defineTool({
  name: "list_branches",
  title: "Listar filiais",
  description: "Lista as filiais da empresa que o usuário pode acessar (use o id nas outras ferramentas).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_a, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("branches")
      .select("id, name, city, state, is_active")
      .order("name");
    if (error) return fail(error.message);
    return ok(JSON.stringify(data ?? []));
  },
});
