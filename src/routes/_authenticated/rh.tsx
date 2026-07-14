import { createFileRoute, Link, Outlet, useRouterState, redirect } from "@tanstack/react-router";
import { Users, LayoutDashboard, Briefcase, CalendarDays, Clock, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/rh")({
  head: () => ({ meta: [{ title: "RH — CozinhaPro" }] }),
  beforeLoad: ({ location }) => {
    if (location.pathname === "/rh" || location.pathname === "/rh/") {
      throw redirect({ to: "/rh/dashboard" });
    }
  },
  component: RhLayout,
});

const tabs = [
  { to: "/rh/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/rh/funcionarios", label: "Funcionários", icon: Users },
  { to: "/rh/cargos", label: "Cargos", icon: Briefcase },
  { to: "/rh/escalas", label: "Escalas", icon: CalendarDays },
  { to: "/rh/ponto", label: "Ponto e Horas", icon: Clock },
  { to: "/rh/beneficios", label: "Benefícios", icon: Wallet },
] as const;

function RhLayout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recursos Humanos</h1>
          <p className="text-sm text-muted-foreground">
            Funcionários, cargos, escalas (12x36, 6x1), banco de horas e folha.
          </p>
        </div>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => {
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
