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
