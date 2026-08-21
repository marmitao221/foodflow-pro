import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type Permission =
  | "rotina"
  | "checklists"
  | "producao"
  | "estoque"
  | "restaurante"
  | "caixa"
  | "limpeza"
  | "relatorios";

export const PERMISSIONS: { value: Permission; label: string; hint: string }[] = [
  { value: "rotina", label: "Minha Rotina", hint: "Ver e concluir as próprias tarefas" },
  { value: "checklists", label: "Checklists", hint: "Tarefas, modelos e gestão da equipe" },
  { value: "producao", label: "Produção", hint: "Fichas técnicas e CMV" },
  { value: "estoque", label: "Estoque", hint: "Itens, entradas, saídas e fornecedores" },
  { value: "restaurante", label: "Restaurante", hint: "Comandas, mesas e produtos" },
  { value: "caixa", label: "Caixa", hint: "Abertura, movimentações e fechamento" },
  { value: "limpeza", label: "Limpeza", hint: "Checklist do setor de limpeza" },
  { value: "relatorios", label: "Relatórios", hint: "Financeiro e indicadores (leitura)" },
];

export const permissionLabel = (p: string) =>
  PERMISSIONS.find((x) => x.value === p)?.label ?? p;

export type Membership = {
  id: string;
  company_id: string;
  role: string;
  branch_id: string | null;
  permissions: string[];
  is_active: boolean;
};

export function useMembership() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["my-membership", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("id, company_id, role, branch_id, permissions, is_active")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Membership | null) ?? null;
    },
  });

  const m = query.data ?? null;
  const isAdmin = !!m && (m.role === "owner" || m.role === "admin");
  const permissions = (m?.permissions ?? []) as Permission[];

  return {
    membership: m,
    loading: query.isLoading,
    isAdmin,
    permissions,
    branchId: m?.branch_id ?? null,
    can: (p: Permission) => isAdmin || permissions.includes(p),
  };
}

/** Permissão (ou perfil admin) exigida para cada área do sistema. */
export function requiredFor(path: string): { perm?: Permission; adminOnly?: boolean } | null {
  if (path.startsWith("/equipe/rotina")) return { perm: "rotina" };
  if (path.startsWith("/equipe/limpeza")) return { perm: "limpeza" };
  if (path.startsWith("/equipe")) return { perm: "checklists" };
  if (path.startsWith("/restaurante/caixa")) return { perm: "caixa" };
  if (path.startsWith("/restaurante")) return { perm: "restaurante" };
  if (path.startsWith("/estoque")) return { perm: "estoque" };
  if (path.startsWith("/fichas") || path.startsWith("/producao")) return { perm: "producao" };
  if (path.startsWith("/financeiro") || path.startsWith("/indicadores")) return { perm: "relatorios" };
  if (path.startsWith("/dashboard")) return { perm: "relatorios" };
  if (path.startsWith("/rh") || path.startsWith("/configuracoes") || path.startsWith("/usuarios")) {
    return { adminOnly: true };
  }
  return null;
}

/** Primeira rota acessível para o usuário (usada em redirecionamentos). */
export function homeFor(isAdmin: boolean, permissions: Permission[]): string {
  if (isAdmin) return "/dashboard";
  const order: [Permission, string][] = [
    ["rotina", "/equipe/rotina"],
    ["limpeza", "/equipe/limpeza"],
    ["checklists", "/equipe/dashboard"],
    ["restaurante", "/restaurante/comandas"],
    ["caixa", "/restaurante/caixa"],
    ["estoque", "/estoque/dashboard"],
    ["producao", "/fichas"],
    ["relatorios", "/dashboard"],
  ];
  for (const [p, route] of order) if (permissions.includes(p)) return route;
  return "/equipe/rotina";
}
