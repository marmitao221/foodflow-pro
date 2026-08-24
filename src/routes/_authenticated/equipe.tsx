import { createFileRoute, Link, Outlet, useRouterState, redirect } from "@tanstack/react-router";
import {
  ClipboardCheck,
  LayoutDashboard,
  Users,
  Briefcase,
  ListChecks,
  UserCheck,
  FileStack,
  History,
} from "lucide-react";

import { requiredFor, useMembership } from "@/lib/permissions";


export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe e Checklist Operacional — CozinhaPro" },
      {
        name: "description",
        content:
          "Gestão de funcionários, rotinas, checklists por setor e acompanhamento diário da equipe.",
      },
      { property: "og:title", content: "Equipe e Checklist Operacional — CozinhaPro" },
      {
        property: "og:description",
        content: "Rotinas, checklists e produtividade da equipe em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: ({ location }) => {
    if (location.pathname === "/equipe" || location.pathname === "/equipe/") {
      throw redirect({ to: "/equipe/dashboard" });
    }
  },
  component: EquipeLayout,
});

const tabs = [
  { to: "/equipe/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/equipe/rotina", label: "Minha Rotina", icon: ClipboardCheck },
  { to: "/equipe/gestao", label: "Gestão da Equipe", icon: UserCheck },
  { to: "/equipe/tarefas", label: "Tarefas", icon: ListChecks },
  { to: "/equipe/modelos", label: "Modelos", icon: FileStack },
  { to: "/equipe/funcionarios", label: "Funcionários", icon: Users },
  { to: "/equipe/funcoes", label: "Funções", icon: Briefcase },
  { to: "/equipe/historico", label: "Histórico", icon: History },
] as const;

function EquipeLayout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { isAdmin, can, loading: loadingPerms } = useMembership();
  const visibleTabs = loadingPerms
    ? []
    : tabs.filter((t) => {
        const required = requiredFor(t.to);
        if (!required) return true;
        if (isAdmin) return true;
        if (required.adminOnly) return false;
        return !!required.perm && can(required.perm);
      });
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipe e Checklist Operacional</h1>
          <p className="text-sm text-muted-foreground">
            Rotinas, checklists por setor, conferência do gestor e produtividade da equipe.
          </p>
        </div>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-border">
        {visibleTabs.map((t) => {
          const active = path.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
