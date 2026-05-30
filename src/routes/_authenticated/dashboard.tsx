import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Boxes, ChefHat, FileText, TrendingDown } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CozinhaPro" }] }),
  component: Dashboard,
});

const kpis = [
  { label: "CMV do mês", value: "—", hint: "Disponível no Módulo 4", icon: TrendingDown },
  { label: "Itens em estoque", value: "—", hint: "Disponível no Módulo 3", icon: Boxes },
  { label: "Refeições produzidas", value: "—", hint: "Disponível no Módulo 4", icon: ChefHat },
  { label: "Contratos ativos", value: "—", hint: "Disponível no Módulo 5", icon: FileText },
];

function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const greeting = profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : "";

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Olá{greeting} 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral da sua operação. Comece cadastrando insumos e fichas técnicas nos próximos módulos.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
              <k.icon className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{k.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{k.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Módulo 1 — Fundação concluída ✅</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Sua conta, empresa e estrutura multi-tenant estão prontas. Próximos módulos que vamos construir:
          </p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Módulo 2 — Cadastros (insumos, fornecedores, fichas técnicas)</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" /> Módulo 3 — Estoque (entradas, saídas, validades)</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" /> Módulo 4 — Produção & CMV</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" /> Módulo 5 — Contratos corporativos</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" /> Módulo 6 — Desperdício & sobras</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" /> Módulo 7 — Dashboard & indicadores avançados</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
